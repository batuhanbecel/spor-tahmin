import { cn } from "@/lib/utils";

/**
 * Yıldız-top: sekiz köşeli yıldızlar bir küre yüzeyine yerleştirilip
 * ortografik izdüşümle düzleme aktarılır. Derinliğe göre küçülüp soluklaşırlar,
 * böylece düz bir halka yerine hacimli bir top okunur.
 *
 * UEFA'nın kendi logosu değil — aynı görsel dilden beslenen özgün bir işaret.
 */

function starPath(cx: number, cy: number, r: number, points = 8, innerRatio = 0.38) {
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * innerRatio;
    const angle = i * step - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + radius * Math.cos(angle)).toFixed(2)} ${(
      cy +
      radius * Math.sin(angle)
    ).toFixed(2)}`;
  }
  return `${d}Z`;
}

type Placed = { x: number; y: number; r: number; z: number };

/**
 * Enlem halkaları — [enlem°, halkadaki yıldız sayısı, açı kaydırması].
 * Kaydırmalar halkaların üst üste binmesini önler.
 */
const BANDS: [number, number, number][] = [
  [62, 4, 0.3],
  [22, 6, 0.0],
  [-18, 6, 0.52],
  [-58, 4, 0.2],
];

function sphereStars(): Placed[] {
  const out: Placed[] = [];

  for (const [latDeg, count, phase] of BANDS) {
    const lat = (latDeg * Math.PI) / 180;
    const y = Math.sin(lat);
    const ringRadius = Math.cos(lat);

    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + phase;
      const x = Math.cos(theta) * ringRadius;
      const z = Math.sin(theta) * ringRadius;

      if (z < 0.02) continue; // arka yüzü atla

      const depth = (z + 1) / 2; // 0.5 (siluet) → 1 (ön yüz)
      out.push({ x: 50 + x * 41, y: 50 - y * 41, r: 5.4 + depth * 7.4, z: depth });
    }
  }

  return out.sort((a, b) => a.z - b.z); // arkadakiler önce çizilsin
}

const STARS = sphereStars();

export function Starball({
  className,
  size = 32,
  tone = "silver",
  title,
}: {
  className?: string;
  size?: number;
  tone?: "silver" | "gold" | "blue";
  title?: string;
}) {
  const fill =
    tone === "gold"
      ? "var(--color-gold-400)"
      : tone === "blue"
        ? "var(--color-blue-400)"
        : "#ffffff";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {STARS.map((s, i) => (
        <path
          key={i}
          d={starPath(s.x, s.y, s.r)}
          fill={fill}
          opacity={0.4 + s.z * 0.6}
        />
      ))}
    </svg>
  );
}

/** Bölüm başlıkları ve boş durumlar için dev filigran. */
export function StarballWatermark({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute select-none", className)}
      aria-hidden="true"
    >
      <Starball size={520} className="opacity-[0.04]" />
    </div>
  );
}

/** Tekil yıldız — madalya, rozet, ayraç. */
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
    tone === "gold"
      ? "var(--color-gold-400)"
      : tone === "blue"
        ? "var(--color-blue-400)"
        : "#ffffff";
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
