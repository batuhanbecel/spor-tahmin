import Link from "next/link";
import { asc, gt } from "drizzle-orm";
import { ArrowRight, CalendarDays, ListOrdered, Trophy, Users } from "lucide-react";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { TeamCrest } from "@/components/team-badge";
import { getGlobalLeaderboard } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { displayName, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  const [upcoming, allTeams, board] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(gt(matches.utcDate, new Date()))
      .orderBy(asc(matches.utcDate))
      .limit(5),
    db.select().from(teams),
    getGlobalLeaderboard(5),
  ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-12 py-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-night-800/80 via-night-900/60 to-night-950/80 px-6 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-star-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-lime-accent/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="chip mb-4">2026/27 sezonu · 36 takım · 8 hafta</span>
          <h1 className="text-3xl font-black leading-tight sm:text-5xl">
            Şampiyonlar Ligi&apos;ni{" "}
            <span className="bg-gradient-to-r from-star-400 to-lime-accent bg-clip-text text-transparent">
              sen sırala.
            </span>
          </h1>
          <p className="mt-4 text-base text-white/60 sm:text-lg">
            Her maçın skorunu tahmin et, 36 takımlık lig aşaması tablosunu baştan diz, finale kadar
            bracket&apos;ini kur. Arkadaşlarınla özel lig aç, genel sıralamada zirveyi kovala.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={session?.user ? "/maclar" : "/kayit"} className="btn-primary">
              {session?.user ? "Tahminlerime git" : "Ücretsiz katıl"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/kurallar" className="btn-ghost">
              Puanlama kuralları
            </Link>
          </div>
        </div>
      </section>

      {/* Nasıl işler */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={<CalendarDays className="h-5 w-5" />}
          title="Maç skorları"
          body="Her hafta 18 maçın skorunu tahmin et. Tam skor 5, doğru sonuç 2 puan."
          href="/maclar"
        />
        <FeatureCard
          icon={<ListOrdered className="h-5 w-5" />}
          title="Sıralama tahmini"
          body="Sezon başlamadan 36 takımı 1'den 36'ya diz. Yaklaştıkça puan kazan."
          href="/siralama"
        />
        <FeatureCard
          icon={<Trophy className="h-5 w-5" />}
          title="Bracket"
          body="Son 16'dan finale kim çıkar, kupayı kim kaldırır? Bracket'ini kur."
          href="/bracket"
        />
        <FeatureCard
          icon={<Users className="h-5 w-5" />}
          title="Arkadaş ligleri"
          body="Davet koduyla özel lig kur, sadece kendi grubunla yarış."
          href="/ligler"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Yaklaşan maçlar */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Yaklaşan maçlar</h2>
            <Link href="/maclar" className="text-sm text-star-400 hover:underline">
              Tümü
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="card p-8 text-center text-sm text-white/45">
              Fikstür henüz yüklenmedi. Kura sonrası otomatik gelecek.
            </div>
          ) : (
            <div className="card divide-y divide-white/6 overflow-hidden">
              {upcoming.map((m) => {
                const home = m.homeTeamId ? teamById.get(m.homeTeamId) : undefined;
                const away = m.awayTeamId ? teamById.get(m.awayTeamId) : undefined;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3.5 text-sm">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <TeamCrest team={home} size={22} />
                      <span className="min-w-0 truncate font-medium">
                        {home?.shortName || home?.name || m.homeTeamPlaceholder || "Belirsiz"}
                      </span>
                      <span className="shrink-0 text-white/25">vs</span>
                      <TeamCrest team={away} size={22} />
                      <span className="min-w-0 truncate font-medium">
                        {away?.shortName || away?.name || m.awayTeamPlaceholder || "Belirsiz"}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-white/40">
                      {formatDateTime(m.utcDate)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Zirve */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Zirvedekiler</h2>
            <Link href="/siralamalar" className="text-sm text-star-400 hover:underline">
              Genel sıralama
            </Link>
          </div>
          {board.length === 0 ? (
            <div className="card p-8 text-center text-sm text-white/45">
              Henüz kimse tahmin yapmadı. İlk sen ol.
            </div>
          ) : (
            <div className="card divide-y divide-white/6 overflow-hidden">
              {board.map((r) => (
                <div key={r.userId} className="flex items-center gap-3 p-3.5 text-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 text-xs font-bold tabular-nums text-white/60">
                    {r.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{displayName(r)}</span>
                  <span className="shrink-0 font-bold tabular-nums">{r.total}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="card card-hover group block p-5">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-star-500/15 text-star-400">
        {icon}
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-white/50">{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-star-400 opacity-0 transition-opacity group-hover:opacity-100">
        Git <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
