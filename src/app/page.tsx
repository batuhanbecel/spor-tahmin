import Link from "next/link";
import { asc, gt } from "drizzle-orm";
import { ArrowRight, CalendarDays, ListOrdered, Trophy, Users } from "lucide-react";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { TeamCrest } from "@/components/team-badge";
import { UserChip } from "@/components/avatar";
import { Star, Starball } from "@/components/starball";
import { PredictionBar } from "@/components/prediction-bar";
import { getMatchAggregates } from "@/lib/insights";
import { getGlobalLeaderboard } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { formatDateTime, isSeeded, NO_DATE_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  const [upcoming, allTeams, board] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(gt(matches.utcDate, new Date()))
      .orderBy(asc(matches.utcDate))
      .limit(4),
    db.select().from(teams),
    getGlobalLeaderboard(5),
  ]);

  const byId = new Map(allTeams.map((t) => [t.id, t]));
  const aggregates = await getMatchAggregates(upcoming.map((m) => m.id));

  return (
    <div className="space-y-14 py-2">
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 px-6 py-14 sm:px-12 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 50% 0%, rgba(47,107,239,.35), transparent 65%), linear-gradient(180deg, #0d1a3a 0%, #060c1c 100%)",
          }}
        />
        <Starball
          size={420}
          className="pointer-events-none absolute -right-24 -top-24 opacity-[0.07]"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="eyebrow mb-5 flex items-center justify-center gap-2">
            <Star size={10} /> 36 takım · 8 hafta · tek kupa <Star size={10} />
          </p>
          <h1 className="display text-[2.75rem] leading-[0.95] text-white sm:text-7xl">
            Avrupa gecelerini
            <span className="mt-1 block bg-gradient-to-r from-blue-300 via-white to-gold-400 bg-clip-text text-transparent">
              sen yaz
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-silver-400 sm:text-lg">
            Her maçın skorunu tahmin et, 36 takımlık tabloyu baştan sırala, finale kadar
            bracket&apos;ini kur. Sonra herkesin ne dediğini gör.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={session?.user ? "/maclar" : "/kayit"} className="btn-primary">
              {session?.user ? "Tahminlerime git" : "Ücretsiz katıl"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/takimlar" className="btn-ghost">
              Takımları gez
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- özellikler */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Feature
          icon={<CalendarDays className="h-5 w-5" />}
          title="Maç skorları"
          body="Her hafta 18 maç. Tam skor 5, doğru sonuç 2 puan."
          href="/maclar"
        />
        <Feature
          icon={<ListOrdered className="h-5 w-5" />}
          title="Sıralama tahmini"
          body="36 takımı 1'den 36'ya diz. Yaklaştıkça puan."
          href="/siralama"
        />
        <Feature
          icon={<Trophy className="h-5 w-5" />}
          title="Bracket"
          body="Son 16'dan finale. Kupayı kim kaldırır?"
          href="/bracket"
        />
        <Feature
          icon={<Users className="h-5 w-5" />}
          title="Kim ne dedi"
          body="Takım takım, maç maç: topluluğun kanaati."
          href="/takimlar"
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        {/* -------------------------------------------------------- yaklaşan */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-xl text-silver-100">Sırada ne var</h2>
            <Link href="/maclar" className="text-sm text-blue-400 hover:underline">
              Tüm maçlar
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-silver-500">
              Fikstür henüz yüklenmedi. Kura sonrası otomatik gelecek.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((m) => {
                const h = m.homeTeamId ? byId.get(m.homeTeamId) : undefined;
                const a = m.awayTeamId ? byId.get(m.awayTeamId) : undefined;
                const hl = h?.shortName || h?.name || m.homeTeamPlaceholder || "Belirsiz";
                const al = a?.shortName || a?.name || m.awayTeamPlaceholder || "Belirsiz";
                return (
                  <Link key={m.id} href={`/mac/${m.id}`} className="panel panel-hover block p-4">
                    <div className="flex items-center gap-3">
                      <TeamCrest team={h} size={26} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-silver-100">
                        {hl}
                      </span>
                      <span className="display text-xs text-silver-600">vs</span>
                      <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-silver-100">
                        {al}
                      </span>
                      <TeamCrest team={a} size={26} />
                    </div>
                    <p className="num mt-2 text-center text-[11px] text-silver-600">
                      {isSeeded(m.id) ? NO_DATE_LABEL : formatDateTime(m.utcDate)}
                    </p>
                    <PredictionBar
                      agg={aggregates.get(m.id)}
                      homeLabel={hl}
                      awayLabel={al}
                      className="mt-3"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* -------------------------------------------------------- zirve */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-xl text-silver-100">Zirve</h2>
            <Link href="/siralamalar" className="text-sm text-blue-400 hover:underline">
              Klasman
            </Link>
          </div>

          {board.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-silver-500">
              Henüz kimse tahmin yapmadı. İlk sen ol.
            </div>
          ) : (
            <div className="panel divide-y divide-white/6 overflow-hidden">
              {board.map((r) => (
                <div key={r.userId} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`num grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-bold ${
                      r.rank === 1
                        ? "bg-gold-400 text-night-1000"
                        : "bg-white/6 text-silver-400"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <UserChip user={r} size={26} className="flex-1 text-sm" />
                  <span className="num display text-lg text-silver-100">{r.total}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Feature({
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
    <Link href={href} className="panel panel-hover group block p-5">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-blue-600/20 text-blue-300 transition-colors group-hover:bg-blue-600/30">
        {icon}
      </span>
      <h3 className="display text-base text-silver-100">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-silver-500">{body}</p>
    </Link>
  );
}
