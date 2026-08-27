import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bracketPredictions,
  leagueMembers,
  leagues,
  matchPredictions,
  matches,
  standingsPredictions,
  teams,
  user,
} from "@/db/schema";

export type LeaderboardRow = {
  userId: string;
  name: string | null;
  nickname: string | null;
  image: string | null;
  matchPoints: number;
  standingsPoints: number;
  bracketPoints: number;
  total: number;
  predictionCount: number;
  exactCount: number;
  rank: number;
};

const leaderboardSelect = sql`
  select
    u.id                                              as user_id,
    u.name                                            as name,
    u.nickname                                        as nickname,
    u.image                                           as image,
    coalesce(mp.points, 0)                            as match_points,
    coalesce(sp.points, 0)                            as standings_points,
    coalesce(bp.points, 0)                            as bracket_points,
    coalesce(mp.points, 0) + coalesce(sp.points, 0) + coalesce(bp.points, 0) as total,
    coalesce(mp.cnt, 0)                               as prediction_count,
    coalesce(mp.exact_cnt, 0)                         as exact_count
  from "user" u
  left join (
    select user_id,
           sum(coalesce(points, 0))                         as points,
           count(*)                                         as cnt,
           count(*) filter (where points = 5)               as exact_cnt
    from match_predictions
    group by user_id
  ) mp on mp.user_id = u.id
  left join standings_predictions sp on sp.user_id = u.id
  left join bracket_predictions   bp on bp.user_id = u.id
`;

type RawRow = {
  user_id: string;
  name: string | null;
  nickname: string | null;
  image: string | null;
  match_points: number | string;
  standings_points: number | string;
  bracket_points: number | string;
  total: number | string;
  prediction_count: number | string;
  exact_count: number | string;
};

function mapRows(rows: RawRow[]): LeaderboardRow[] {
  return rows.map((r, i) => ({
    userId: r.user_id,
    name: r.name,
    nickname: r.nickname,
    image: r.image,
    matchPoints: Number(r.match_points),
    standingsPoints: Number(r.standings_points),
    bracketPoints: Number(r.bracket_points),
    total: Number(r.total),
    predictionCount: Number(r.prediction_count),
    exactCount: Number(r.exact_count),
    rank: i + 1,
  }));
}

export async function getGlobalLeaderboard(limit = 200): Promise<LeaderboardRow[]> {
  const res = await db.execute(
    sql`${leaderboardSelect} order by total desc, exact_count desc, prediction_count desc, u.created_at asc limit ${limit}`,
  );
  return mapRows(res.rows as unknown as RawRow[]);
}

export async function getLeagueLeaderboard(leagueId: string): Promise<LeaderboardRow[]> {
  const res = await db.execute(
    sql`${leaderboardSelect}
        join league_members lm on lm.user_id = u.id and lm.league_id = ${leagueId}
        order by total desc, exact_count desc, prediction_count desc, u.created_at asc`,
  );
  return mapRows(res.rows as unknown as RawRow[]);
}

export async function getAllTeams() {
  return db.select().from(teams).orderBy(asc(teams.name));
}

export async function getAllMatches() {
  return db.select().from(matches).orderBy(asc(matches.utcDate));
}

export async function getMatchesByMatchday(matchday: number) {
  return db
    .select()
    .from(matches)
    .where(and(eq(matches.stage, "LEAGUE_STAGE"), eq(matches.matchday, matchday)))
    .orderBy(asc(matches.utcDate));
}

export async function getMatchesByStage(stage: string) {
  return db
    .select()
    .from(matches)
    .where(eq(matches.stage, stage))
    .orderBy(asc(matches.utcDate));
}

export async function getUserPredictions(userId: string, matchIds: number[]) {
  if (!matchIds.length) return [];
  return db
    .select()
    .from(matchPredictions)
    .where(
      and(
        eq(matchPredictions.userId, userId),
        inArray(matchPredictions.matchId, matchIds),
      ),
    );
}

export async function getStandingsPrediction(userId: string) {
  const [row] = await db
    .select()
    .from(standingsPredictions)
    .where(eq(standingsPredictions.userId, userId));
  return row ?? null;
}

export async function getBracketPrediction(userId: string) {
  const [row] = await db
    .select()
    .from(bracketPredictions)
    .where(eq(bracketPredictions.userId, userId));
  return row ?? null;
}

export async function getUserLeagues(userId: string) {
  return db
    .select({
      id: leagues.id,
      name: leagues.name,
      slug: leagues.slug,
      code: leagues.code,
      ownerId: leagues.ownerId,
      createdAt: leagues.createdAt,
      memberCount: sql<number>`(select count(*) from league_members lm2 where lm2.league_id = ${leagues.id})`,
    })
    .from(leagues)
    .innerJoin(leagueMembers, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId))
    .orderBy(desc(leagues.createdAt));
}

export async function getLeagueBySlug(slug: string) {
  const [row] = await db.select().from(leagues).where(eq(leagues.slug, slug));
  return row ?? null;
}

/** Bir maç için tüm tahminleri (maç başladıktan sonra herkese açık). */
export async function getMatchPredictionFeed(matchId: number) {
  return db
    .select({
      userId: matchPredictions.userId,
      name: user.name,
      nickname: user.nickname,
      image: user.image,
      homeGoals: matchPredictions.homeGoals,
      awayGoals: matchPredictions.awayGoals,
      points: matchPredictions.points,
    })
    .from(matchPredictions)
    .innerJoin(user, eq(user.id, matchPredictions.userId))
    .where(eq(matchPredictions.matchId, matchId))
    .orderBy(desc(matchPredictions.points));
}

export async function getNextMatchday(): Promise<number> {
  const rows = await db
    .select({ matchday: matches.matchday, status: matches.status })
    .from(matches)
    .where(eq(matches.stage, "LEAGUE_STAGE"))
    .orderBy(asc(matches.utcDate));

  for (const r of rows) {
    if (r.status !== "FINISHED" && r.matchday) return r.matchday;
  }
  return rows.length ? (rows[rows.length - 1].matchday ?? 1) : 1;
}
