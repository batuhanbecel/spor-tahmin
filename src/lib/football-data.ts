/**
 * football-data.org v4 istemcisi.
 * Ücretsiz tier Şampiyonlar Ligi'ni (CL) kapsar — 10 istek/dakika sınırı vardır.
 */

const BASE = "https://api.football-data.org/v4";
export const COMPETITION = "CL";
/** 2026-27 sezonu API'de başlangıç yılıyla anılır. */
export const SEASON = process.env.FD_SEASON ?? "2026";

export type FdTeam = {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
  area?: { name?: string } | null;
};

export type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: Partial<FdTeam> & { id?: number | null; name?: string | null };
  awayTeam: Partial<FdTeam> & { id?: number | null; name?: string | null };
  score: {
    winner: string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
};

export type FdStandingRow = {
  position: number;
  team: FdTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

function token() {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error("FOOTBALL_DATA_TOKEN tanımlı değil.");
  return t;
}

async function fd<T>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": token() },
    next: { revalidate },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status} — ${path} — ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export function fetchTeams() {
  return fd<{ teams: FdTeam[] }>(
    `/competitions/${COMPETITION}/teams?season=${SEASON}`,
    60 * 60 * 24,
  );
}

export function fetchMatches() {
  return fd<{ matches: FdMatch[] }>(
    `/competitions/${COMPETITION}/matches?season=${SEASON}`,
    120,
  );
}

export function fetchStandings() {
  return fd<{
    standings: { stage: string; type: string; group: string | null; table: FdStandingRow[] }[];
  }>(`/competitions/${COMPETITION}/standings?season=${SEASON}`, 300);
}
