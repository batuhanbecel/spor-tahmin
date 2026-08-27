import type { Team } from "@/db/schema";
import { cn } from "@/lib/utils";

export function TeamCrest({
  team,
  size = 28,
  className,
}: {
  team?: Pick<Team, "crest" | "name" | "tla"> | null;
  size?: number;
  className?: string;
}) {
  if (team?.crest) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crest}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md bg-white/8 text-[10px] font-bold text-white/50",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {team?.tla ?? "?"}
    </span>
  );
}

export function teamLabel(team?: Pick<Team, "name" | "shortName"> | null, fallback = "Belirsiz") {
  return team?.shortName || team?.name || fallback;
}
