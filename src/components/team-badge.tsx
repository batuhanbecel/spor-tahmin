import type { Team } from "@/db/schema";
import { cn } from "@/lib/utils";

type CrestTeam = Pick<Team, "crest" | "name" | "tla" | "shortName">;

/** Takım adından kararlı bir renk üretir — armasız rozetler birbirinden ayrılsın. */
function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

/**
 * Kulüp arması. football-data armaları PNG ya da SVG olabiliyor; ikisi de
 * <img> ile sorunsuz. Arma yoksa takıma özgü renkli bir TLA rozeti çizilir —
 * boş gri kutu yerine kasıtlı görünsün diye.
 */
export function TeamCrest({
  team,
  size = 28,
  className,
}: {
  team?: CrestTeam | null;
  size?: number;
  className?: string;
}) {
  if (team?.crest) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crest}
        alt={team.name ? `${team.name} arması` : ""}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const label = team?.tla ?? "?";
  const hue = hueFor(team?.name ?? label);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md font-bold leading-none ring-1 ring-inset ring-white/10",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.3),
        background: `linear-gradient(150deg, hsl(${hue} 55% 32%), hsl(${(hue + 28) % 360} 50% 20%))`,
        color: `hsl(${hue} 70% 88%)`,
      }}
      title={team?.name ?? undefined}
    >
      {label}
    </span>
  );
}

export function teamLabel(
  team?: Pick<Team, "name" | "shortName"> | null,
  fallback = "Belirsiz",
) {
  return team?.shortName || team?.name || fallback;
}
