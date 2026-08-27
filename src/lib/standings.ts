import type { Match, Team } from "@/db/schema";

export type StandingRow = {
  teamId: number;
  team?: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  position: number;
};

/**
 * Lig aşaması tablosunu oynanmış maçlardan hesaplar.
 * Sıralama: puan > averaj > atılan gol > galibiyet > isim.
 * (UEFA'nın kulüp katsayısı gibi alt kriterleri burada uygulanmaz.)
 */
export function computeLeagueTable(
  matches: Match[],
  teams: Team[],
): StandingRow[] {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const rows = new Map<number, StandingRow>();

  const ensure = (teamId: number) => {
    let r = rows.get(teamId);
    if (!r) {
      r = {
        teamId,
        team: byId.get(teamId),
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        position: 0,
      };
      rows.set(teamId, r);
    }
    return r;
  };

  // Tabloya tüm lig aşaması takımlarını ekle (henüz oynamamış olsalar da)
  for (const m of matches) {
    if (m.stage !== "LEAGUE_STAGE") continue;
    if (m.homeTeamId) ensure(m.homeTeamId);
    if (m.awayTeamId) ensure(m.awayTeamId);
  }

  for (const m of matches) {
    if (m.stage !== "LEAGUE_STAGE") continue;
    if (m.status !== "FINISHED") continue;
    if (m.homeTeamId == null || m.awayTeamId == null) continue;
    if (m.homeGoals == null || m.awayGoals == null) continue;

    const home = ensure(m.homeTeamId);
    const away = ensure(m.awayTeamId);

    home.played++;
    away.played++;
    home.goalsFor += m.homeGoals;
    home.goalsAgainst += m.awayGoals;
    away.goalsFor += m.awayGoals;
    away.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.won++;
      away.lost++;
      home.points += 3;
    } else if (m.homeGoals < m.awayGoals) {
      away.won++;
      home.lost++;
      away.points += 3;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  const list = [...rows.values()];
  for (const r of list) r.goalDiff = r.goalsFor - r.goalsAgainst;

  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      b.won - a.won ||
      (a.team?.name ?? "").localeCompare(b.team?.name ?? "", "tr"),
  );

  list.forEach((r, i) => (r.position = i + 1));
  return list;
}

/** Lig aşaması bittiğinde 1-36 arası gerçek takım id dizisi. */
export function actualOrder(table: StandingRow[]): number[] {
  return table.map((r) => r.teamId);
}
