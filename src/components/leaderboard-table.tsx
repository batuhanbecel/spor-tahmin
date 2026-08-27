import type { LeaderboardRow } from "@/lib/queries";
import { cn, displayName } from "@/lib/utils";

export function LeaderboardTable({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string | null;
}) {
  if (!rows.length) {
    return (
      <div className="card p-10 text-center text-sm text-white/50">
        Henüz sıralamada kimse yok. İlk tahminini yapan ilk sıraya geçer.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="w-12 px-3 py-3 text-center">#</th>
              <th className="px-3 py-3">Oyuncu</th>
              <th className="px-3 py-3 text-right">Maç</th>
              <th className="px-3 py-3 text-right">Sıralama</th>
              <th className="px-3 py-3 text-right">Bracket</th>
              <th className="px-3 py-3 text-right">Tam skor</th>
              <th className="px-3 py-3 text-right font-bold text-white/60">Toplam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => {
              const me = r.userId === currentUserId;
              return (
                <tr
                  key={r.userId}
                  className={cn(
                    "transition-colors hover:bg-white/4",
                    me && "bg-star-500/10 hover:bg-star-500/14",
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        "inline-grid h-7 w-7 place-items-center rounded-lg text-xs font-bold tabular-nums",
                        r.rank === 1
                          ? "bg-lime-accent text-night-950"
                          : r.rank === 2
                            ? "bg-white/25 text-white"
                            : r.rank === 3
                              ? "bg-amber-accent/70 text-night-950"
                              : "text-white/40",
                      )}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="h-7 w-7 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/8 text-xs font-bold text-white/50">
                          {displayName(r).slice(0, 1).toLocaleUpperCase("tr")}
                        </span>
                      )}
                      <span className="font-medium">{displayName(r)}</span>
                      {me && <span className="chip text-[10px]">sen</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/60">
                    {r.matchPoints}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/60">
                    {r.standingsPoints}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/60">
                    {r.bracketPoints}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/40">
                    {r.exactCount}
                  </td>
                  <td className="px-3 py-3 text-right text-base font-bold tabular-nums">
                    {r.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
