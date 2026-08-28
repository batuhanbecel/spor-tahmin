/**
 * 2026/27 UEFA Şampiyonlar Ligi lig aşaması kurası.
 * Kaynak: UEFA.com, 27 Ağustos 2026 Monako kurası.
 *
 * Bu dosya geçici bir tohumdur: maç takvimi (tarih ve saatler) football-data'ya
 * düştüğü anda gerçek fikstür bunun yerini alır. Tohum kayıtları NEGATİF id
 * kullanır; ilk başarılı gerçek senkronda tamamı silinir.
 */

export type DrawTeam = {
  /** Kısa ad — kura listesinde geçtiği hali */
  key: string;
  name: string;
  tla: string;
  country: string;
  pot: 1 | 2 | 3 | 4;
  /** Evinde ağırlayacağı 4 rakip */
  home: string[];
};

export const DRAW: DrawTeam[] = [
  { key: "Paris", name: "Paris Saint-Germain", tla: "PSG", country: "Fransa", pot: 1,
    home: ["Barcelona", "Roma", "Galatasaray", "Slovan Bratislava"] },
  { key: "Bayern München", name: "Bayern München", tla: "FCB", country: "Almanya", pot: 1,
    home: ["Arsenal", "Real Betis", "Bodø/Glimt", "Slavia Praha"] },
  { key: "Real Madrid", name: "Real Madrid", tla: "RMA", country: "İspanya", pot: 1,
    home: ["Inter", "PSV", "Leipzig", "LASK"] },
  { key: "Liverpool", name: "Liverpool", tla: "LIV", country: "İngiltere", pot: 1,
    home: ["Atleti", "Porto", "Villarreal", "Lens"] },
  { key: "Inter", name: "Inter", tla: "INT", country: "İtalya", pot: 1,
    home: ["Liverpool", "Club Brugge", "Shakhtar", "Stuttgart"] },
  { key: "Man City", name: "Manchester City", tla: "MCI", country: "İngiltere", pot: 1,
    home: ["Paris", "Sporting CP", "Napoli", "AEK Athens"] },
  { key: "Arsenal", name: "Arsenal", tla: "ARS", country: "İngiltere", pot: 1,
    home: ["Real Madrid", "Borussia Dortmund", "Lille", "Sabah"] },
  { key: "Barcelona", name: "Barcelona", tla: "BAR", country: "İspanya", pot: 1,
    home: ["Man City", "Aston Villa", "Feyenoord", "Como"] },
  { key: "Atleti", name: "Atlético de Madrid", tla: "ATM", country: "İspanya", pot: 1,
    home: ["Bayern München", "Man United", "Fenerbahçe", "Viking"] },

  { key: "Borussia Dortmund", name: "Borussia Dortmund", tla: "BVB", country: "Almanya", pot: 2,
    home: ["Inter", "Real Betis", "Villarreal", "AEK Athens"] },
  { key: "Roma", name: "Roma", tla: "ROM", country: "İtalya", pot: 2,
    home: ["Real Madrid", "Sporting CP", "Lille", "Slovan Bratislava"] },
  { key: "Sporting CP", name: "Sporting CP", tla: "SCP", country: "Portekiz", pot: 2,
    home: ["Barcelona", "Man United", "Galatasaray", "LASK"] },
  { key: "Aston Villa", name: "Aston Villa", tla: "AVL", country: "İngiltere", pot: 2,
    home: ["Paris", "Borussia Dortmund", "Fenerbahçe", "Viking"] },
  { key: "Porto", name: "Porto", tla: "POR", country: "Portekiz", pot: 2,
    home: ["Man City", "PSV", "Napoli", "Slavia Praha"] },
  { key: "Man United", name: "Manchester United", tla: "MUN", country: "İngiltere", pot: 2,
    home: ["Bayern München", "Roma", "Leipzig", "Sabah"] },
  { key: "Club Brugge", name: "Club Brugge", tla: "CLU", country: "Belçika", pot: 2,
    home: ["Liverpool", "Aston Villa", "Bodø/Glimt", "Lens"] },
  { key: "Real Betis", name: "Real Betis", tla: "BET", country: "İspanya", pot: 2,
    home: ["Arsenal", "Porto", "Feyenoord", "Como"] },
  { key: "PSV", name: "PSV", tla: "PSV", country: "Hollanda", pot: 2,
    home: ["Atleti", "Club Brugge", "Shakhtar", "Stuttgart"] },

  { key: "Feyenoord", name: "Feyenoord", tla: "FEY", country: "Hollanda", pot: 3,
    home: ["Inter", "Porto", "Leipzig", "Como"] },
  { key: "Lille", name: "Lille", tla: "LIL", country: "Fransa", pot: 3,
    home: ["Bayern München", "Real Betis", "Galatasaray", "Slovan Bratislava"] },
  { key: "Napoli", name: "Napoli", tla: "NAP", country: "İtalya", pot: 3,
    home: ["Arsenal", "Club Brugge", "Bodø/Glimt", "Viking"] },
  { key: "Leipzig", name: "RB Leipzig", tla: "RBL", country: "Almanya", pot: 3,
    home: ["Man City", "PSV", "Shakhtar", "Lens"] },
  { key: "Villarreal", name: "Villarreal", tla: "VIL", country: "İspanya", pot: 3,
    home: ["Paris", "Man United", "Napoli", "Sabah"] },
  { key: "Shakhtar", name: "Şahtar Donetsk", tla: "SHK", country: "Ukrayna", pot: 3,
    home: ["Real Madrid", "Sporting CP", "Fenerbahçe", "AEK Athens"] },
  { key: "Galatasaray", name: "Galatasaray", tla: "GAL", country: "Türkiye", pot: 3,
    home: ["Barcelona", "Aston Villa", "Feyenoord", "Stuttgart"] },
  { key: "Slavia Praha", name: "Slavia Praha", tla: "SLA", country: "Çekya", pot: 3,
    home: ["Arsenal", "Aston Villa", "Villarreal", "Lens"] },
  { key: "Stuttgart", name: "VfB Stuttgart", tla: "VFB", country: "Almanya", pot: 3,
    home: ["Atleti", "Club Brugge", "Lille", "Viking"] },

  { key: "Fenerbahçe", name: "Fenerbahçe", tla: "FB", country: "Türkiye", pot: 4,
    home: ["Liverpool", "Roma", "Villarreal", "Slavia Praha"] },
  { key: "Bodø/Glimt", name: "Bodø/Glimt", tla: "BOD", country: "Norveç", pot: 4,
    home: ["Atleti", "Borussia Dortmund", "Lille", "LASK"] },
  { key: "Como", name: "Como", tla: "COM", country: "İtalya", pot: 4,
    home: ["Paris", "Man United", "Leipzig", "AEK Athens"] },
  { key: "Lens", name: "Lens", tla: "LEN", country: "Fransa", pot: 4,
    home: ["Man City", "Sporting CP", "Bodø/Glimt", "Como"] },
  { key: "AEK Athens", name: "AEK Atina", tla: "AEK", country: "Yunanistan", pot: 4,
    home: ["Real Madrid", "Roma", "Galatasaray", "LASK"] },
  { key: "LASK", name: "LASK", tla: "LSK", country: "Avusturya", pot: 4,
    home: ["Liverpool", "Porto", "Fenerbahçe", "Slovan Bratislava"] },
  { key: "Slovan Bratislava", name: "Slovan Bratislava", tla: "SLO", country: "Slovakya", pot: 4,
    home: ["Inter", "Real Betis", "Shakhtar", "Stuttgart"] },
  { key: "Viking", name: "Viking", tla: "VIK", country: "Norveç", pot: 4,
    home: ["Bayern München", "PSV", "Feyenoord", "Sabah"] },
  { key: "Sabah", name: "Sabah", tla: "SAB", country: "Azerbaycan", pot: 4,
    home: ["Barcelona", "Borussia Dortmund", "Napoli", "Slavia Praha"] },
];

/** Tohum kayıtları negatif id alır; gerçek senkron geldiğinde hepsi silinir. */
export const SEED_TEAM_ID = (index: number) => -(1000 + index);
export const SEED_MATCH_ID = (index: number) => -(2000 + index);

/** Lig aşamasının ilk maç günü — takvim gelene kadar yer tutucu. */
export const LEAGUE_PHASE_START = "2026-09-16T19:00:00Z";

export type DrawPairing = { homeKey: string; awayKey: string };

/** 36 takımın ev listelerinden 144 eşleşme üretir. */
export function drawPairings(): DrawPairing[] {
  const out: DrawPairing[] = [];
  for (const team of DRAW) {
    for (const away of team.home) {
      out.push({ homeKey: team.key, awayKey: away });
    }
  }
  return out;
}
