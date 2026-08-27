import { cn } from "@/lib/utils";

/**
 * Özgün "yıldız-top" markası: sekiz köşeli yıldızların bir küre yüzeyine
 * dizilmiş gibi, merkeze doğru küçülerek yerleştirilmesi. UEFA'nın kendi
 * logosu değil — aynı görsel dilden beslenen kendi işaretimiz.
 */

function starPath(cx: number, cy: number, r: number, points = 8, inner = 0.4) {
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * inner;
    const angle = i * step - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

export function Starball({
  className,
  size = 32,
  tone = "silver",
}: {
  className?: string;
  size?: number;
  tone?: "silver" | "gold" | "blue";
}) {
  const fill =
    tone === "gold" ? "var(--color-gold-400)" : tone === "blue" ? "var(--color-blue-400)" : "#fff";

  // Dış halka: 8 büyük yıldız · orta halka: 8 küçük · merkez: 1
  const outer = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + 34 * Math.cos(a), y: 50 + 34 * Math.sin(a), r: 11 - Math.abs(Math.sin(a)) * 2 };
  });
  const mid = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8;
    return { x: 50 + 17 * Math.cos(a), y: 50 + 17 * Math.sin(a), r: 6 };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      {outer.map((s, i) => (
        <path key={`o${i}`} d={starPath(s.x, s.y, s.r)} fill={fill} opacity={0.92} />
      ))}
      {mid.map((s, i) => (
        <path key={`m${i}`} d={starPath(s.x, s.y, s.r)} fill={fill} opacity={0.6} />
      ))}
      <path d={starPath(50, 50, 7)} fill={fill} opacity={0.95} />
    </svg>
  );
}

/** Başlıklarda ve boş durumlarda kullanılan dev filigran. */
export function StarballWatermark({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute select-none", className)} aria-hidden="true">
      <Starball size={520} className="opacity-[0.035]" />
    </div>
  );
}

/** Küçük tekil yıldız — madalya, rozet, ayraç. */
export function Star({
  size = 12,
  className,
  tone = "gold",
}: {
  size?: number;
  className?: string;
  tone?: "silver" | "gold" | "blue";
}) {
  const fill =
    tone === "gold" ? "var(--color-gold-400)" : tone === "blue" ? "var(--color-blue-400)" : "#fff";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path d={starPath(50, 50, 48)} fill={fill} />
    </svg>
  );
}
