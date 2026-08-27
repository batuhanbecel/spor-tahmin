import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  matchPredictions,
  matches,
  settings,
  standingsPredictions,
  bracketPredictions,
  teams,
} from "@/db/schema";
import { fetchMatches, fetchTeams } from "./football-data";
import { scoreBracket, scoreMatch, scoreStandings } from "./scoring";
import { computeLeagueTable } from "./standings";

export type SyncReport = {
  teams: number;
  matches: number;
  scoredPredictions: number;
  standingsScored: number;
  bracketScored: number;
  at: string;
};

/** football-data'dan takımları ve fikstürü çekip veritabanına yazar. */
export async function syncCompetition(): Promise<SyncReport> {
  const [teamRes, matchRes] = await Promise.all([fetchTeams(), fetchMatches()]);

  const teamRows = teamRes.teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? null,
    tla: t.tla ?? null,
    crest: t.crest ?? null,
    country: t.area?.name ?? null,
  }));

  if (teamRows.length) {
    await db
      .insert(teams)
      .values(teamRows)
      .onConflictDoUpdate({
        target: teams.id,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          tla: sql`excluded.tla`,
          crest: sql`excluded.crest`,
          country: sql`excluded.country`,
        },
      });
  }

  // Fikstürde geçen ama /teams uçtan gelmeyen takımları da ekle
  const known = new Set(teamRows.map((t) => t.id));
  const extra = new Map<number, typeof teamRows[number]>();
  for (const m of matchRes.matches) {
    for (const side of [m.homeTeam, m.awayTeam]) {
      if (side?.id && !known.has(side.id) && !extra.has(side.id)) {
        extra.set(side.id, {
          id: side.id,
          name: side.name ?? `#${side.id}`,
          shortName: side.shortName ?? null,
          tla: side.tla ?? null,
          crest: side.crest ?? null,
          country: null,
        });
      }
    }
  }
  if (extra.size) {
    await db.insert(teams).values([...extra.values()]).onConflictDoNothing();
  }

  const matchRows = matchRes.matches.map((m) => ({
    id: m.id,
    stage: m.stage,
    matchday: m.matchday ?? null,
    utcDate: new Date(m.utcDate),
    status: m.status,
    homeTeamId: m.homeTeam?.id ?? null,
    awayTeamId: m.awayTeam?.id ?? null,
    homeTeamPlaceholder: m.homeTeam?.id ? null : (m.homeTeam?.name ?? null),
    awayTeamPlaceholder: m.awayTeam?.id ? null : (m.awayTeam?.name ?? null),
    homeGoals: m.score?.fullTime?.home ?? null,
    awayGoals: m.score?.fullTime?.away ?? null,
    winner: m.score?.winner ?? null,
    updatedAt: new Date(),
  }));

  // Neon HTTP tek istekte çok büyük payload sevmez — parçalayarak yaz
  const chunk = 100;
  for (let i = 0; i < matchRows.length; i += chunk) {
    await db
      .insert(matches)
      .values(matchRows.slice(i, i + chunk))
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          stage: sql`excluded.stage`,
          matchday: sql`excluded.matchday`,
          utcDate: sql`excluded.utc_date`,
          status: sql`excluded.status`,
          homeTeamId: sql`excluded.home_team_id`,
          awayTeamId: sql`excluded.away_team_id`,
          homeTeamPlaceholder: sql`excluded.home_team_placeholder`,
          awayTeamPlaceholder: sql`excluded.away_team_placeholder`,
          homeGoals: sql`excluded.home_goals`,
          awayGoals: sql`excluded.away_goals`,
          winner: sql`excluded.winner`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  const scored = await scorePendingPredictions();
  const standingsScored = await scoreStandingsPredictions();
  const bracketScored = await scoreBracketPredictions();

  const at = new Date().toISOString();
  await db
    .insert(settings)
    .values({ key: "last_sync", value: at })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });

  return {
    teams: teamRows.length + extra.size,
    matches: matchRows.length,
    scoredPredictions: scored,
    standingsScored,
    bracketScored,
    at,
  };
}

/** Biten ama henüz puanlanmamış maç tahminlerini puanlar. */
export async function scorePendingPredictions(): Promise<number> {
  const finished = await db
    .select({
      id: matches.id,
      homeGoals: matches.homeGoals,
      awayGoals: matches.awayGoals,
    })
    .from(matches)
    .where(
      and(
        eq(matches.status, "FINISHED"),
        isNotNull(matches.homeGoals),
        isNotNull(matches.awayGoals),
      ),
    );

  if (!finished.length) return 0;

  const pending = await db
    .select()
    .from(matchPredictions)
    .where(
      and(
        isNull(matchPredictions.points),
        inArray(
          matchPredictions.matchId,
          finished.map((m) => m.id),
        ),
      ),
    );

  const resultById = new Map(finished.map((m) => [m.id, m]));
  let count = 0;

  for (const p of pending) {
    const actual = resultById.get(p.matchId);
    if (!actual || actual.homeGoals == null || actual.awayGoals == null) continue;
    const points = scoreMatch(
      { homeGoals: p.homeGoals, awayGoals: p.awayGoals },
      { homeGoals: actual.homeGoals, awayGoals: actual.awayGoals },
    );
    await db
      .update(matchPredictions)
      .set({ points, updatedAt: new Date() })
      .where(eq(matchPredictions.id, p.id));
    count++;
  }

  return count;
}

/** Lig aşaması bittiyse sıralama tahminlerini puanlar. */
export async function scoreStandingsPredictions(): Promise<number> {
  const allMatches = await db.select().from(matches);
  const leagueMatches = allMatches.filter((m) => m.stage === "LEAGUE_STAGE");
  if (!leagueMatches.length) return 0;
  const done = leagueMatches.every((m) => m.status === "FINISHED");
  if (!done) return 0;

  const allTeams = await db.select().from(teams);
  const table = computeLeagueTable(allMatches, allTeams);
  const actual = table.map((r) => r.teamId);

  const preds = await db.select().from(standingsPredictions);
  let count = 0;
  for (const p of preds) {
    const points = scoreStandings(p.order ?? [], actual);
    if (p.points === points) continue;
    await db
      .update(standingsPredictions)
      .set({ points, updatedAt: new Date() })
      .where(eq(standingsPredictions.userId, p.userId));
    count++;
  }
  return count;
}

/** Eleme turlarında ilerledikçe bracket tahminlerini yeniden puanlar. */
export async function scoreBracketPredictions(): Promise<number> {
  const all = await db.select().from(matches);

  const advancing = (stage: string): number[] => {
    // Bir tura çıkan takımlar = o turda oynayan takımlar
    const ids = new Set<number>();
    for (const m of all) {
      if (m.stage !== stage) continue;
      if (m.homeTeamId) ids.add(m.homeTeamId);
      if (m.awayTeamId) ids.add(m.awayTeamId);
    }
    return [...ids];
  };

  const finalMatch = all.find((m) => m.stage === "FINAL" && m.status === "FINISHED");
  let winner: number | undefined;
  if (finalMatch && finalMatch.homeGoals != null && finalMatch.awayGoals != null) {
    winner =
      finalMatch.homeGoals > finalMatch.awayGoals
        ? (finalMatch.homeTeamId ?? undefined)
        : finalMatch.homeGoals < finalMatch.awayGoals
          ? (finalMatch.awayTeamId ?? undefined)
          : (finalMatch.winner === "HOME_TEAM"
              ? (finalMatch.homeTeamId ?? undefined)
              : finalMatch.winner === "AWAY_TEAM"
                ? (finalMatch.awayTeamId ?? undefined)
                : undefined);
  }

  const actual = {
    R16: advancing("LAST_16"),
    QF: advancing("QUARTER_FINALS"),
    SF: advancing("SEMI_FINALS"),
    F: advancing("FINAL"),
    WINNER: winner,
  };

  const preds = await db.select().from(bracketPredictions);
  let count = 0;
  for (const p of preds) {
    const points = scoreBracket(p.picks ?? {}, actual);
    if (p.points === points) continue;
    await db
      .update(bracketPredictions)
      .set({ points, updatedAt: new Date() })
      .where(eq(bracketPredictions.userId, p.userId));
    count++;
  }
  return count;
}
