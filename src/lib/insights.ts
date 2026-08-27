import { sql } from "drizzle-orm";
import { db } from "@/db";

/* ------------------------------------------------------------------ */
/*  Maç bazlı tahmin dağılımı                                          */
/* ------------------------------------------------------------------ */

export type MatchAggregate = {
  matchId: number;
  total: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  topScore: { home: number; away: number; count: number } | null;
  avgHome: number | null;
  avgAway: number | null;
};

export async function getMatchAggregates(matchIds: number[]): Promise<Map<number, MatchAggregate>> {
  const out = new Map<number, MatchAggregate>();
  if (!matchIds.length) return out;

  const ids = sql.join(matchIds.map((id) => sql`${id}`), sql`,`);

  const counts = await db.execute(sql`
    select
      match_id,
      count(*)::int                                            as total,
      count(*) filter (where home_goals > away_goals)::int     as home_win,
      count(*) filter (where home_goals = away_goals)::int     as draw,
      count(*) filter (where home_goals < away_goals)::int     as away_win,
      round(avg(home_goals)::numeric, 2)                       as avg_home,
      round(avg(away_goals)::numeric, 2)                       as avg_away
    from match_predictions
    where match_id in (${ids})
    group by match_id
  `);

  const top = await db.execute(sql`
    select distinct on (match_id) match_id, home_goals, away_goals, cnt
    from (
      select match_id, home_goals, away_goals, count(*)::int as cnt
      from match_predictions
      where match_id in (${ids})
      group by match_id, home_goals, away_goals
    ) t
    order by match_id, cnt desc, home_goals desc
  `);

  const topByMatch = new Map<number, { home: number; away: number; count: number }>();
  for (const r of top.rows as unknown as {
    match_id: number; home_goals: number; away_goals: number; cnt: number;
  }[]) {
    topByMatch.set(Number(r.match_id), {
      home: Number(r.home_goals),
      away: Number(r.away_goals),
      count: Number(r.cnt),
    });
  }

  for (const r of counts.rows as unknown as {
    match_id: number; total: number; home_win: number; draw: number; away_win: number;
    avg_home: string | null; avg_away: string | null;
  }[]) {
    const id = Number(r.match_id);
    out.set(id, {
      matchId: id,
      total: Number(r.total),
      homeWin: Number(r.home_win),
      draw: Number(r.draw),
      awayWin: Number(r.away_win),
      topScore: topByMatch.get(id) ?? null,
      avgHome: r.avg_home == null ? null : Number(r.avg_home),
      avgAway: r.avg_away == null ? null : Number(r.avg_away),
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Bir maça kim ne demiş (maç başladıktan sonra herkese açık)         */
/* ------------------------------------------------------------------ */

export type PublicPrediction = {
  userId: string;
  name: string | null;
  nickname: string | null;
  image: string | null;
  homeGoals: number;
  awayGoals: number;
  points: number | null;
};

export async function getMatchPredictionList(matchId: number): Promise<PublicPrediction[]> {
  const res = await db.execute(sql`
    select p.user_id, u.name, u.nickname, u.image, p.home_goals, p.away_goals, p.points
    from match_predictions p
    join "user" u on u.id = p.user_id
    where p.match_id = ${matchId}
    order by p.points desc nulls last, u.name asc
  `);
  return (res.rows as unknown as {
    user_id: string; name: string | null; nickname: string | null; image: string | null;
    home_goals: number; away_goals: number; points: number | null;
  }[]).map((r) => ({
    userId: r.user_id,
    name: r.name,
    nickname: r.nickname,
    image: r.image,
    homeGoals: Number(r.home_goals),
    awayGoals: Number(r.away_goals),
    points: r.points == null ? null : Number(r.points),
  }));
}

/* ------------------------------------------------------------------ */
/*  Bir takımı kim kaçıncı sıraya koymuş                               */
/* ------------------------------------------------------------------ */

export type StandingsPlacement = {
  userId: string;
  name: string | null;
  nickname: string | null;
  image: string | null;
  position: number;
};

export type TeamStandingsInsight = {
  count: number;
  avg: number | null;
  best: number | null;
  worst: number | null;
  placements: StandingsPlacement[];
  /** Sıra aralıklarına göre dağılım: 1-8, 9-16, 17-24, 25-36 */
  buckets: { label: string; count: number }[];
};

export async function getTeamStandingsInsight(teamId: number): Promise<TeamStandingsInsight> {
  const res = await db.execute(sql`
    select sp.user_id, u.name, u.nickname, u.image, x.idx::int as position
    from standings_predictions sp
    join "user" u on u.id = sp.user_id
    cross join lateral (
      select ordinality as idx
      from jsonb_array_elements(sp."order") with ordinality as e(val, ordinality)
      where (e.val)::text::int = ${teamId}
      limit 1
    ) x
    order by x.idx asc
  `);

  const placements = (res.rows as unknown as {
    user_id: string; name: string | null; nickname: string | null;
    image: string | null; position: number;
  }[]).map((r) => ({
    userId: r.user_id,
    name: r.name,
    nickname: r.nickname,
    image: r.image,
    position: Number(r.position),
  }));

  if (!placements.length) {
    return { count: 0, avg: null, best: null, worst: null, placements: [], buckets: [] };
  }

  const positions = placements.map((p) => p.position);
  const bucketDefs: [string, number, number][] = [
    ["1-8 · doğrudan son 16", 1, 8],
    ["9-16", 9, 16],
    ["17-24 · play-off", 17, 24],
    ["25-36 · elenir", 25, 36],
  ];

  return {
    count: placements.length,
    avg: Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10,
    best: Math.min(...positions),
    worst: Math.max(...positions),
    placements,
    buckets: bucketDefs.map(([label, lo, hi]) => ({
      label,
      count: positions.filter((p) => p >= lo && p <= hi).length,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Bracket: takımı kaç kişi hangi tura çıkarmış                       */
/* ------------------------------------------------------------------ */

export type BracketInsight = { round: string; label: string; count: number; total: number };

export async function getTeamBracketInsight(teamId: number): Promise<BracketInsight[]> {
  const res = await db.execute(sql`
    select
      count(*)::int                                                              as total,
      count(*) filter (where picks->'R16'   @> ${JSON.stringify([teamId])}::jsonb)::int as r16,
      count(*) filter (where picks->'QF'    @> ${JSON.stringify([teamId])}::jsonb)::int as qf,
      count(*) filter (where picks->'SF'    @> ${JSON.stringify([teamId])}::jsonb)::int as sf,
      count(*) filter (where picks->'F'     @> ${JSON.stringify([teamId])}::jsonb)::int as f,
      count(*) filter (where (picks->>'WINNER')::int = ${teamId})::int           as winner
    from bracket_predictions
  `);

  const r = (res.rows[0] ?? {}) as unknown as Record<string, number>;
  const total = Number(r.total ?? 0);
  if (!total) return [];

  return [
    { round: "R16", label: "Son 16", count: Number(r.r16 ?? 0), total },
    { round: "QF", label: "Çeyrek final", count: Number(r.qf ?? 0), total },
    { round: "SF", label: "Yarı final", count: Number(r.sf ?? 0), total },
    { round: "F", label: "Final", count: Number(r.f ?? 0), total },
    { round: "WINNER", label: "Şampiyon", count: Number(r.winner ?? 0), total },
  ];
}

/* ------------------------------------------------------------------ */
/*  Bir oyuncunun herkese açık tahmin karnesi                          */
/* ------------------------------------------------------------------ */

export async function getPublicUser(userId: string) {
  const res = await db.execute(sql`
    select id, name, nickname, image, created_at
    from "user" where id = ${userId} limit 1
  `);
  const r = res.rows[0] as unknown as
    | { id: string; name: string | null; nickname: string | null; image: string | null; created_at: string }
    | undefined;
  return r ?? null;
}
