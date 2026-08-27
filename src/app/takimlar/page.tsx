import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { TeamCrest } from "@/components/team-badge";
import { StarballWatermark } from "@/components/starball";

export const metadata: Metadata = { title: "Takımlar" };
export const dynamic = "force-dynamic";

export default async function TakimlarPage() {
  const [allTeams, leagueMatches] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(matches).where(eq(matches.stage, "LEAGUE_STAGE")),
  ]);

  const inLeague = new Set<number>();
  for (const m of leagueMatches) {
    if (m.homeTeamId) inLeague.add(m.homeTeamId);
    if (m.awayTeamId) inLeague.add(m.awayTeamId);
  }
  const list = inLeague.size ? allTeams.filter((t) => inLeague.has(t.id)) : allTeams;

  return (
    <div className="space-y-6 py-2">
      <header className="relative space-y-1 overflow-hidden">
        <StarballWatermark className="-right-40 -top-56" />
        <h1 className="display relative text-3xl text-silver-100 sm:text-4xl">Takımlar</h1>
        <p className="relative max-w-2xl text-sm text-silver-500">
          Bir takıma gir: 8 maçında topluluğun kanaati ne, kim kaçıncı sıraya koymuş,
          kupayı kaldıracağını kim düşünüyor — hepsi tek sayfada.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-silver-500">
          Takım listesi henüz yüklenmedi. Kura sonrası fikstür otomatik gelecek.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((t) => (
            <Link
              key={t.id}
              href={`/takim/${t.id}`}
              className="panel panel-hover group flex items-center gap-3 p-3.5"
            >
              <TeamCrest team={t} size={34} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-silver-100">
                  {t.shortName || t.name}
                </span>
                <span className="block truncate text-[11px] text-silver-600">{t.country}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
