import Link from "next/link";
import { cn, displayName } from "@/lib/utils";

type U = {
  userId?: string;
  id?: string;
  name?: string | null;
  nickname?: string | null;
  image?: string | null;
};

export function Avatar({
  user,
  size = 28,
  className,
}: {
  user: U;
  size?: number;
  className?: string;
}) {
  const label = displayName(user);
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-white/12", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-blue-600/25 font-semibold text-blue-300 ring-1 ring-white/10",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {label.slice(0, 1).toLocaleUpperCase("tr")}
    </span>
  );
}

/** Avatar + isim, oyuncunun herkese açık karnesine link. */
export function UserChip({
  user,
  size = 26,
  className,
  muted,
}: {
  user: U;
  size?: number;
  className?: string;
  muted?: boolean;
}) {
  const id = user.userId ?? user.id;
  const inner = (
    <>
      <Avatar user={user} size={size} />
      <span className={cn("min-w-0 truncate", muted ? "text-silver-400" : "text-silver-100")}>
        {displayName(user)}
      </span>
    </>
  );

  if (!id) {
    return <span className={cn("flex items-center gap-2", className)}>{inner}</span>;
  }

  return (
    <Link
      href={`/oyuncu/${id}`}
      className={cn(
        "flex min-w-0 items-center gap-2 transition-colors hover:text-white",
        className,
      )}
    >
      {inner}
    </Link>
  );
}
