/**
 * Puanlama kuralları — tek kaynak. Değiştirirsen /kurallar sayfası da otomatik güncellenir.
 */

export const RULES = {
  match: {
    exact: 5, // Tam skor
    diff: 3, // Doğru gol farkı (tam skor değil, beraberlik dışı)
    outcome: 2, // Doğru sonuç (1-X-2)
    miss: 0,
  },
  standings: {
    /** Bir takım için: max(0, perfect - |tahmin - gerçek|) */
    perfect: 4,
    /** İlk 8'i (doğrudan son 16 biletini) doğru bilinen takım başına ek puan */
    topEightBonus: 2,
    /** 36 sıranın tamamı doğruysa ek ödül */
    flawless: 50,
  },
  bracket: {
    R16: 2, // Play-off'u geçip son 16'ya kalan her doğru takım
    QF: 3,
    SF: 5,
    F: 8,
    WINNER: 15,
  },
} as const;

export type MatchResult = { homeGoals: number; awayGoals: number };

export function scoreMatch(pred: MatchResult, actual: MatchResult): number {
  const { exact, diff, outcome, miss } = RULES.match;

  if (pred.homeGoals === actual.homeGoals && pred.awayGoals === actual.awayGoals) {
    return exact;
  }

  const sign = (r: MatchResult) => Math.sign(r.homeGoals - r.awayGoals);
  if (sign(pred) !== sign(actual)) return miss;

  // Sonuç doğru. Beraberlik dışı maçlarda gol farkı da tuttuysa daha yüksek puan.
  const predDiff = pred.homeGoals - pred.awayGoals;
  const actualDiff = actual.homeGoals - actual.awayGoals;
  if (predDiff !== 0 && predDiff === actualDiff) return diff;

  return outcome;
}

/**
 * Lig aşaması sıralama tahmini puanı.
 * @param predicted 1. sıradan 36. sıraya tahmin edilen takım id dizisi
 * @param actual    1. sıradan 36. sıraya gerçek takım id dizisi
 */
export function scoreStandings(predicted: number[], actual: number[]): number {
  const { perfect, topEightBonus, flawless } = RULES.standings;
  const actualPos = new Map<number, number>();
  actual.forEach((teamId, i) => actualPos.set(teamId, i + 1));

  let total = 0;
  let correctAll = 0;

  predicted.forEach((teamId, i) => {
    const real = actualPos.get(teamId);
    if (!real) return;
    const predPos = i + 1;
    const delta = Math.abs(predPos - real);
    total += Math.max(0, perfect - delta);
    if (delta === 0) correctAll += 1;
    if (predPos <= 8 && real <= 8) total += topEightBonus;
  });

  if (actual.length > 0 && correctAll === actual.length) total += flawless;
  return total;
}

export type BracketPicks = {
  R16?: number[];
  QF?: number[];
  SF?: number[];
  F?: number[];
  WINNER?: number;
};

export type BracketActual = {
  R16?: number[];
  QF?: number[];
  SF?: number[];
  F?: number[];
  WINNER?: number;
};

export function scoreBracket(picks: BracketPicks, actual: BracketActual): number {
  let total = 0;
  (["R16", "QF", "SF", "F"] as const).forEach((round) => {
    const picked = picks[round] ?? [];
    const real = new Set(actual[round] ?? []);
    if (real.size === 0) return;
    picked.forEach((teamId) => {
      if (real.has(teamId)) total += RULES.bracket[round];
    });
  });
  if (actual.WINNER && picks.WINNER === actual.WINNER) total += RULES.bracket.WINNER;
  return total;
}

/** Tahminler maç başlama saatinde kilitlenir. */
export function isLocked(utcDate: Date | string, now: Date = new Date()): boolean {
  const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return d.getTime() <= now.getTime();
}
