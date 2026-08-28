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
import {
  fetchCompetition,
  fetchMatches,
  fetchTeams,
  SEASON,
  type FdAttempt,
} from "./football-data";
import { scoreBracket, scoreMatch, scoreStandings } from "./scoring";
import { computeLeagueTable } from "./standings";
import { seedDraw } from "./seed-draw";

export type SyncReport = {
  teams: number;
  matches: number;
  scoredPredictions: number;
  standingsScored: number;
  bracketScored: number;
  at: string;
  /** "live" = doğru sezon içeri alındı, "awaiting" = 2026/27 henüz yayınlanmadı */
  fixtureStatus: "live" | "awaiting";
  /** API'ye yapılan her çağrının sonucu — boş dönerse sebebini burada gör. */
  diagnostics: {
    season: string | null;
    currentSeason?: { startDate: string; endDate: string; currentMatchday: number | null };
    attempts: FdAttempt[];
    note?: string;
    purged?: number;
  };
};

/** Hedef sezon: 2026/27. API bu sezona geçene kadar veri içeri alınmaz. */
export const TARGET_SEASON_START_YEAR = Number(process.env.FD_TARGET_SEASON ?? "2026");

async function putSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });
}

/** football-data'dan takımları ve fikstürü çekip veritabanına yazar. */
export async function syncCompetition(): Promise<SyncReport> {
  const attempts: FdAttempt[] = [];

  const competition = await fetchCompetition(attempts);
  const [teamRes, matchRes] = await Promise.all([
    fetchTeams(attempts),
    fetchMatches(attempts),
  ]);

  /* ----------------------------------------------------------------
   * Sezon kontrolü.
   * football-data kura sonrası bir süre eski sezonu "current" göstermeye
   * devam ediyor. O veriyi içeri alırsak 2026/27 tahmin ligi geçen sezonun
   * fikstürüyle dolar. Bu yüzden hedef sezon gelene kadar hiçbir şey yazmıyor,
   * daha önce yanlışlıkla yazılmışsa temizliyoruz.
   * ---------------------------------------------------------------- */
  const seasonStartYear = competition?.currentSeason?.startDate
    ? Number(competition.currentSeason.startDate.slice(0, 4))
    : null;

  const seasonIsTarget =
    seasonStartYear === null || seasonStartYear >= TARGET_SEASON_START_YEAR;

  if (!seasonIsTarget) {
    /**
     * Takvim gelmedi ama kura belli — 2026/27 eşleşmelerini tohumla.
     * Eski sezondan kalan her şey içeride siliniyor, armalar bu çağrının
     * elindeki takım listesinden ada göre eşleştiriliyor.
     */
    const seed = await seedDraw(teamRes.teams);
    const at = new Date().toISOString();
    await putSetting("last_sync", at);
    await putSetting("fixture_status", "awaiting");
    await putSetting("fixture_source", "draw");
    await putSetting(
      "awaiting_note",
      `football-data hâlâ ${seasonStartYear}/${String((seasonStartYear ?? 0) + 1).slice(2)} sezonunu güncel gösteriyor.`,
    );

    return {
      teams: seed.teams,
      matches: seed.matches,
      scoredPredictions: 0,
      standingsScored: 0,
      bracketScored: 0,
      at,
      fixtureStatus: "awaiting",
      diagnostics: {
        season: SEASON,
        currentSeason: competition?.currentSeason
          ? {
              startDate: competition.currentSeason.startDate,
              endDate: competition.currentSeason.endDate,
              currentMatchday: competition.currentSeason.currentMatchday,
            }
          : undefined,
        attempts,
        purged: seed.purged,
        note:
          `API'nin güncel sezonu ${seasonStartYear}/${String((seasonStartYear ?? 0) + 1).slice(2)} — ` +
          `hedef ${TARGET_SEASON_START_YEAR}/${String(TARGET_SEASON_START_YEAR + 1).slice(2)}. ` +
          `Takvim gelmediği için kura tohumlandı: ${seed.teams} takım, ${seed.matches} eşleşme, ` +
          `${seed.crestsMatched} arma eşleşti` +
          `${seed.purged ? `, ${seed.purged} eski maç temizlendi` : ""}. ` +
          `football-data yeni sezona geçince gerçek fikstür bunun yerini alacak.`,
      },
    };
  }

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

  // API'de artık olmayan maçları (ör. önceki sezondan kalanlar) temizle
  let purged = await purgeMatchesNotIn(matchRows.map((m) => m.id));

  // Gerçek fikstür geldiyse kura tohumunu (negatif id'ler) tamamen kaldır
  if (matchRows.length) {
    purged += await purgeSeedRows();
    await putSetting("fixture_source", "api");
  }

  const scored = await scorePendingPredictions();
  const standingsScored = await scoreStandingsPredictions();
  const bracketScored = await scoreBracketPredictions();

  const at = new Date().toISOString();
  await putSetting("last_sync", at);
  await putSetting("fixture_status", matchRows.length ? "live" : "awaiting");

  let note: string | undefined;
  if (matchRows.length === 0) {
    const restricted = attempts.some((a) => a.status === 403);
    const rateLimited = attempts.some((a) => a.status === 429);
    if (rateLimited) {
      note =
        "API dakika limiti aşıldı (ücretsiz katman: 10 istek/dk). Bir dakika bekleyip tekrar dene.";
    } else if (restricted) {
      note =
        "API 403 döndü. Ücretsiz katman yalnızca güncel sezonu verir — FD_SEASON değişkenini kaldırmayı dene.";
    } else {
      note =
        "API başarılı ama fikstür boş. Kura sonrası maçların football-data'ya düşmesi birkaç saat sürebilir.";
    }
  }

  return {
    teams: teamRows.length + extra.size,
    matches: matchRows.length,
    scoredPredictions: scored,
    standingsScored,
    bracketScored,
    at,
    fixtureStatus: matchRows.length ? "live" : "awaiting",
    diagnostics: {
      purged,
      season: SEASON,
      currentSeason: competition?.currentSeason
        ? {
            startDate: competition.currentSeason.startDate,
            endDate: competition.currentSeason.endDate,
            currentMatchday: competition.currentSeason.currentMatchday,
          }
        : undefined,
      attempts,
      note,
    },
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

/* ------------------------------------------------------------------ */
/*  Temizlik                                                           */
/* ------------------------------------------------------------------ */

/** Kura tohumunu siler: negatif id'li maçlar ve takımlar. */
async function purgeSeedRows(): Promise<number> {
  const res = await db.execute(
    sql`with gone as (delete from matches where id < 0 returning 1)
        select count(*)::int as count from gone`,
  );
  const n = Number((res.rows as unknown as { count: number }[])[0]?.count ?? 0);
  await db.execute(sql`delete from teams where id < 0`);
  return n;
}

/** API'den gelen listede olmayan maçları siler (sezon değişimi temizliği). */
async function purgeMatchesNotIn(keepIds: number[]): Promise<number> {
  if (!keepIds.length) return 0;
  const ids = sql.join(keepIds.map((id) => sql`${id}`), sql`,`);
  const res = await db.execute(
    sql`with gone as (delete from matches where id not in (${ids}) returning 1)
        select count(*)::int as count from gone`,
  );
  const row = (res.rows as unknown as { count: number }[])[0];
  return Number(row?.count ?? 0);
}

/** Fikstürün durumu — sayfalarda uyarı şeridi göstermek için. */
export async function getFixtureStatus(): Promise<{
  status: "live" | "awaiting";
  note: string | null;
  lastSync: string | null;
}> {
  const res = await db.execute(
    sql`select key, value from settings where key in ('fixture_status','awaiting_note','last_sync')`,
  );
  const map = new Map(
    (res.rows as unknown as { key: string; value: string | null }[]).map((r) => [r.key, r.value]),
  );
  return {
    status: map.get("fixture_status") === "live" ? "live" : "awaiting",
    note: map.get("awaiting_note") ?? null,
    lastSync: map.get("last_sync") ?? null,
  };
}
