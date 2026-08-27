import type { Metadata } from "next";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { TeamCrest } from "@/components/team-badge";
import { computeLeagueTable } from "@/lib/standings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lig aşaması puan durumu" };
export const dynamic = "force-dynamic";

export default async function PuanDurumuPage() {
  const [allMatches, allTeams] = await Promise.all([
    db.select().from(matches),
    db.select().from(teams),
  ]);

  const table = computeLeagueTable(allMatches, allTeams);

  if (!table.length) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <h2 className="text-lg font-semibold">Puan durumu henüz oluşmadı</h2>
        <p className="mt-2 text-sm text-white/50">
          Lig aşaması fikstürü yüklendiğinde tablo burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Lig aşaması puan durumu</h1>
        <p className="text-sm text-white/50">
          <Legend color="bg-lime-accent" label="1-8: doğrudan son 16" />
          <Legend color="bg-star-500" label="9-24: play-off" />
          <Legend color="bg-white/20" label="25-36: elenir" />
        </p>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[11px] uppercase tracking-wider text-white/40">
                <th className="w-10 px-2 py-3 text-center">#</th>
                <th className="px-3 py-3 text-left">Takım</th>
                <th className="px-2 py-3 text-right">O</th>
                <th className="px-2 py-3 text-right">G</th>
                <th className="px-2 py-3 text-right">B</th>
                <th className="px-2 py-3 text-right">M</th>
                <th className="px-2 py-3 text-right">A</th>
                <th className="px-2 py-3 text-right">Y</th>
                <th className="px-2 py-3 text-right">Av</th>
                <th className="px-3 py-3 text-right font-bold text-white/60">P</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {table.map((r) => (
                <tr key={r.teamId} className="hover:bg-white/4">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-6 w-1 rounded-full",
                          r.position <= 8
                            ? "bg-lime-accent"
                            : r.position <= 24
                              ? "bg-star-500"
                              : "bg-white/20",
                        )}
                      />
                      <span className="tabular-nums text-white/45">{r.position}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <TeamCrest team={r.team} size={22} />
                      <span className="font-medium">{r.team?.shortName || r.team?.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{r.played}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{r.won}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{r.drawn}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{r.lost}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/45">{r.goalsFor}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/45">
                    {r.goalsAgainst}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/45">
                    {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">
                    {r.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-white/35">
        Sıralama puan, averaj, atılan gol ve galibiyet sayısına göre hesaplanır. UEFA&apos;nın
        kulüp katsayısı gibi alt kriterleri uygulanmaz.
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="mr-4 inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}
