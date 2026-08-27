/**
 * football-data.org v4 istemcisi.
 *
 * Ücretsiz katman Şampiyonlar Ligi'ni kapsar ama YALNIZCA güncel sezonu verir ve
 * dakikada 10 istek sınırı vardır. `season` filtresi ücretsiz katmanda kısıtlı
 * olduğu için varsayılan olarak parametresiz çağrı yapılır — API zaten güncel
 * sezonu döndürür. FD_SEASON tanımlanırsa önce onunla denenir, boş dönerse
 * parametresiz çağrıya düşülür.
 */

const BASE = "https://api.football-data.org/v4";
export const COMPETITION = "CL";

/** Boş bırakılırsa güncel sezon kullanılır (ücretsiz katman için doğrusu budur). */
export const SEASON = process.env.FD_SEASON?.trim() || null;

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

/** Her istek için ne olduğunu kaydeder — teşhis çıktısında gösterilir. */
export type FdAttempt = {
  url: string;
  status: number;
  ok: boolean;
  count?: number;
  error?: string;
};

function token() {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error("FOOTBALL_DATA_TOKEN tanımlı değil.");
  return t;
}

async function call<T>(path: string, attempts: FdAttempt[]): Promise<T | null> {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token() },
      cache: "no-store",
    });
    const text = await res.text();

    if (!res.ok) {
      attempts.push({
        url: path,
        status: res.status,
        ok: false,
        error: text.slice(0, 300),
      });
      return null;
    }

    const json = JSON.parse(text) as T;
    attempts.push({ url: path, status: res.status, ok: true });
    return json;
  } catch (err) {
    attempts.push({
      url: path,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : "bilinmeyen hata",
    });
    return null;
  }
}

/**
 * Önce FD_SEASON ile (varsa), sonra parametresiz dener.
 * İlk dolu sonucu döndürür.
 */
async function withFallback<T>(
  build: (query: string) => string,
  pick: (data: T) => unknown[],
  attempts: FdAttempt[],
): Promise<T | null> {
  const queries: string[] = [];
  if (SEASON) queries.push(`?season=${SEASON}`);
  queries.push("");

  let lastNonEmpty: T | null = null;

  for (const q of queries) {
    const data = await call<T>(build(q), attempts);
    if (!data) continue;
    const items = pick(data);
    attempts[attempts.length - 1].count = items.length;
    if (items.length > 0) return data;
    lastNonEmpty = data;
  }

  return lastNonEmpty;
}

export async function fetchTeams(attempts: FdAttempt[] = []) {
  const data = await withFallback<{ teams: FdTeam[] }>(
    (q) => `/competitions/${COMPETITION}/teams${q}`,
    (d) => d.teams ?? [],
    attempts,
  );
  return { teams: data?.teams ?? [], attempts };
}

export async function fetchMatches(attempts: FdAttempt[] = []) {
  const data = await withFallback<{ matches: FdMatch[] }>(
    (q) => `/competitions/${COMPETITION}/matches${q}`,
    (d) => d.matches ?? [],
    attempts,
  );
  return { matches: data?.matches ?? [], attempts };
}

/** Yarışmanın güncel sezon bilgisi — teşhis için. */
export async function fetchCompetition(attempts: FdAttempt[] = []) {
  const data = await call<{
    name: string;
    code: string;
    currentSeason?: {
      id: number;
      startDate: string;
      endDate: string;
      currentMatchday: number | null;
    };
  }>(`/competitions/${COMPETITION}`, attempts);
  return data;
}
