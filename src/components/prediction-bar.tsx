import type { MatchAggregate } from "@/lib/insights";
import { cn } from "@/lib/utils";

/**
 * 1-X-2 dağılım şeridi. Renk tek başına anlam taşımasın diye
 * her dilimin üstünde yüzde etiketi var.
 */
export function PredictionBar({
  agg,
  homeLabel,
  awayLabel,
  className,
}: {
  agg: MatchAggregate | undefined;
  homeLabel: string;
  awayLabel: string;
  className?: string;
}) {
  if (!agg || agg.total === 0) {
    return (
      <p className={cn("text-xs text-silver-600", className)}>Henüz tahmin yok.</p>
    );
  }

  const pct = (n: number) => Math.round((n / agg.total) * 100);
  const parts = [
    { key: "1", value: agg.homeWin, cls: "bg-blue-500", label: homeLabel },
    { key: "X", value: agg.draw, cls: "bg-silver-500", label: "Beraberlik" },
    { key: "2", value: agg.awayWin, cls: "bg-gold-400", label: awayLabel },
  ];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/6">
        {parts.map((p) =>
          p.value > 0 ? (
            <div
              key={p.key}
              className={p.cls}
              style={{ width: `${pct(p.value)}%` }}
              title={`${p.label}: ${p.value} kişi (%${pct(p.value)})`}
            />
          ) : null,
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-silver-500">
        <span className="num">
          <span className="font-semibold text-blue-400">1</span> %{pct(agg.homeWin)}
        </span>
        <span className="num">
          <span className="font-semibold text-silver-300">X</span> %{pct(agg.draw)}
        </span>
        <span className="num">
          <span className="font-semibold text-gold-400">2</span> %{pct(agg.awayWin)}
        </span>
      </div>
    </div>
  );
}

export function ConsensusScore({ agg }: { agg: MatchAggregate | undefined }) {
  if (!agg?.topScore) return null;
  const pct = Math.round((agg.topScore.count / agg.total) * 100);
  return (
    <span className="chip num">
      En çok denen: {agg.topScore.home}-{agg.topScore.away} (%{pct})
    </span>
  );
}
