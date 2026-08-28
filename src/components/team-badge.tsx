import type { Team } from "@/db/schema";
import { cn } from "@/lib/utils";

type CrestTeam = Pick<Team, "crest" | "name" | "tla" | "shortName">;

/**
 * Kulüp arması. football-data.org armaları hem PNG hem SVG olabiliyor;
 * ikisi de <img> ile sorunsuz. Arma yoksa TLA rozetine düşüyoruz.
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

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md bg-white/8 font-bold text-silver-500",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.32) }}
      title={team?.name ?? undefined}
    >
      {team?.tla ?? "?"}
    </span>
  );
}

export function teamLabel(
  team?: Pick<Team, "name" | "shortName"> | null,
  fallback = "Belirsiz",
) {
  return team?.shortName || team?.name || fallback;
}
