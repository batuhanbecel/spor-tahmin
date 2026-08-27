import type { LeaderboardRow } from "@/lib/queries";
import { UserChip } from "./avatar";
import { Star } from "./starball";
import { cn } from "@/lib/utils";

export function LeaderboardTable({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string | null;
}) {
  if (!rows.length) {
    return (
      <div className="panel p-12 text-center text-sm text-silver-500">
        Henüz klasmanda kimse yok. İlk tahminini yapan zirveye çıkar.
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left">
              <th className="eyebrow w-14 px-3 py-3 text-center">#</th>
              <th className="eyebrow px-3 py-3">Oyuncu</th>
              <th className="eyebrow px-3 py-3 text-right">Maç</th>
              <th className="eyebrow px-3 py-3 text-right">Sıralama</th>
              <th className="eyebrow px-3 py-3 text-right">Bracket</th>
              <th className="eyebrow px-3 py-3 text-right">Tam</th>
              <th className="eyebrow px-3 py-3 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((r) => {
              const me = r.userId === currentUserId;
              const podium = r.rank <= 3;
              return (
                <tr
                  key={r.userId}
                  className={cn(
                    "transition-colors hover:bg-white/4",
                    me && "bg-blue-600/12 hover:bg-blue-600/16",
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        "num inline-grid h-7 w-8 place-items-center rounded-md text-xs font-bold",
                        r.rank === 1
                          ? "bg-gold-400 text-night-1000"
                          : r.rank === 2
                            ? "bg-silver-300 text-night-1000"
                            : r.rank === 3
                              ? "bg-[#c88b52] text-night-1000"
                              : "text-silver-600",
                      )}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <UserChip user={r} size={28} />
                      {podium && <Star size={11} tone={r.rank === 1 ? "gold" : "silver"} />}
                      {me && <span className="chip">sen</span>}
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right text-silver-400">{r.matchPoints}</td>
                  <td className="num px-3 py-3 text-right text-silver-400">{r.standingsPoints}</td>
                  <td className="num px-3 py-3 text-right text-silver-400">{r.bracketPoints}</td>
                  <td className="num px-3 py-3 text-right text-silver-600">{r.exactCount}</td>
                  <td className="num display px-3 py-3 text-right text-lg text-silver-100">
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
