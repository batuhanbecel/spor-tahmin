import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, or } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { TeamCrest } from "@/components/team-badge";
import { UserChip } from "@/components/avatar";
import { Star } from "@/components/starball";
import {
  getMatchAggregates,
  getTeamBracketInsight,
  getTeamStandingsInsight,
} from "@/lib/insights";
import { cn, formatDateTime, hasStarted, isSeeded, NO_DATE_LABEL, nowMs, STAGE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [t] = await db.select().from(teams).where(eq(teams.id, Number(id)));
  return { title: t ? `${t.name} · tahminler` : "Takım bulunamadı" };
}

export default async function TakimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) notFound();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) notFound();

  const fixtures = await db
    .select()
    .from(matches)
    .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
    .orderBy(asc(matches.utcDate));

  const allTeams = await db.select().from(teams);
  const byId = new Map(allTeams.map((t) => [t.id, t]));

  const [aggregates, standings, bracket] = await Promise.all([
    getMatchAggregates(fixtures.map((m) => m.id)),
    getTeamStandingsInsight(teamId),
    getTeamBracketInsight(teamId),
  ]);

  const now = nowMs();

  return (
    <div className="space-y-10 py-2">
      {/* ---------------------------------------------------------- başlık */}
      <header className="panel-raised relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 opacity-[0.06]">
          <TeamCrest team={team} size={240} />
        </div>
        <div className="relative flex items-center gap-4">
          <TeamCrest team={team} size={64} />
          <div className="min-w-0">
            <h1 className="display break-words text-xl leading-tight text-silver-100 sm:text-4xl">{team.name}</h1>
            <p className="mt-0.5 text-sm text-silver-500">
              {team.country}
              {team.tla && <span className="ml-2 chip">{team.tla}</span>}
            </p>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- fikstür */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="display text-xl text-silver-100">Halk ne diyor?</h2>
          <span className="eyebrow">{fixtures.length} maç</span>
        </div>
        <p className="max-w-2xl text-sm text-silver-500">
          Her maç için topluluğun {team.shortName || team.name} hakkındaki kanaati. Maç
          başladığında kimin tam olarak ne yazdığı da açılır.
        </p>

        {fixtures.length === 0 ? (
          <div className="panel p-10 text-center text-sm text-silver-500">
            Bu takımın fikstürü henüz yüklenmedi.
          </div>
        ) : (
          <div className="panel divide-y divide-white/6 overflow-hidden">
            {fixtures.map((m) => {
              const isHome = m.homeTeamId === teamId;
              const oppId = isHome ? m.awayTeamId : m.homeTeamId;
              const opp = oppId ? byId.get(oppId) : undefined;
              const agg = aggregates.get(m.id);

              // Dağılımı bu takımın gözünden çevir
              const win = agg ? (isHome ? agg.homeWin : agg.awayWin) : 0;
              const loss = agg ? (isHome ? agg.awayWin : agg.homeWin) : 0;
              const draw = agg?.draw ?? 0;
              const total = agg?.total ?? 0;

              const verdicts = [
                { key: "w", label: "Kazanır", n: win, cls: "text-pitch-400", bar: "bg-pitch-400" },
                { key: "d", label: "Berabere", n: draw, cls: "text-silver-300", bar: "bg-silver-500" },
                { key: "l", label: "Kaybeder", n: loss, cls: "text-flag-400", bar: "bg-flag-400" },
              ];
              const lead = [...verdicts].sort((a, b) => b.n - a.n)[0];
              const started = hasStarted(m, now);
              const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

              return (
                <Link
                  key={m.id}
                  href={`/mac/${m.id}`}
                  className="group block px-4 py-4 transition-colors hover:bg-white/4 sm:px-5"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="chip w-[62px] justify-center">
                      {m.stage === "LEAGUE_STAGE"
                        ? (m.matchday ? `${m.matchday}. hf` : "Lig")
                        : STAGE_LABELS[m.stage]}
                    </span>
                    <span className="chip w-[34px] justify-center" title={isHome ? "Ev sahibi" : "Deplasman"}>
                      {isHome ? "EV" : "DEP"}
                    </span>
                    <TeamCrest team={opp} size={24} />
                    <span className="min-w-0 flex-1 truncate font-medium text-silver-100">
                      {opp?.shortName || opp?.name || "Belirsiz"}
                    </span>

                    {/* mobilde satiri kir: tarih/skor alt satira insin */}
                    <span className="basis-full sm:hidden" aria-hidden="true" />

                    {m.status === "FINISHED" ? (
                      <span className="num shrink-0 rounded-md bg-white/8 px-2 py-1 text-sm font-bold text-silver-100">
                        {m.homeGoals}-{m.awayGoals}
                      </span>
                    ) : (
                      <span className="num shrink-0 text-xs text-silver-500">
                        {isSeeded(m.id) ? NO_DATE_LABEL : formatDateTime(m.utcDate)}
                      </span>
                    )}
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-silver-600 transition-transform group-hover:translate-x-0.5 group-hover:text-silver-300 sm:ml-0" />
                  </div>

                  {total > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/6">
                        {verdicts.map((v) =>
                          v.n > 0 ? (
                            <div key={v.key} className={v.bar} style={{ width: `${pct(v.n)}%` }} />
                          ) : null,
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                        {verdicts.map((v) => (
                          <span
                            key={v.key}
                            className={cn(
                              "num",
                              v.key === lead.key ? cn(v.cls, "font-semibold") : "text-silver-600",
                            )}
                          >
                            {v.label} %{pct(v.n)}
                          </span>
                        ))}
                        <span className="num ml-auto text-silver-600">
                          {total} tahmin
                          {agg?.topScore &&
                            ` · en çok ${agg.topScore.home}-${agg.topScore.away}`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-silver-600">
                      {started ? "Kimse tahmin etmemiş." : "Henüz tahmin yok — ilk sen ol."}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- sıralama */}
      <section className="space-y-3">
        <h2 className="display text-xl text-silver-100">Kaçıncı bitirir?</h2>

        {standings.count === 0 ? (
          <div className="panel p-8 text-center text-sm text-silver-500">
            Henüz kimse lig aşaması sıralaması göndermedi.{" "}
            <Link href="/siralama" className="text-blue-400 hover:underline">
              İlk sen ol
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="panel space-y-4 p-5">
              <div className="flex items-end gap-2">
                <span className="display num text-5xl text-gold-400">{standings.avg}</span>
                <span className="pb-2 text-sm text-silver-500">ortalama sıra</span>
              </div>
              <div className="flex gap-6 text-sm">
                <span className="num text-silver-400">
                  En iyi <strong className="text-silver-100">{standings.best}.</strong>
                </span>
                <span className="num text-silver-400">
                  En kötü <strong className="text-silver-100">{standings.worst}.</strong>
                </span>
              </div>
              <div className="space-y-2 border-t border-white/8 pt-4">
                {standings.buckets.map((b) => {
                  const pct = Math.round((b.count / standings.count) * 100);
                  return (
                    <div key={b.label} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-silver-500">
                        <span>{b.label}</span>
                        <span className="num">{b.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="border-b border-white/8 px-5 py-3">
                <span className="eyebrow">Kim kaçıncıya koymuş</span>
              </div>
              <ul className="max-h-[380px] divide-y divide-white/6 overflow-y-auto">
                {standings.placements.map((p) => (
                  <li key={p.userId} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span
                      className={cn(
                        "num grid h-7 w-9 shrink-0 place-items-center rounded-md text-xs font-bold",
                        p.position <= 8
                          ? "bg-gold-400/15 text-gold-400"
                          : p.position <= 24
                            ? "bg-blue-500/15 text-blue-300"
                            : "bg-white/6 text-silver-500",
                      )}
                    >
                      {p.position}.
                    </span>
                    <UserChip user={p} size={24} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- bracket */}
      {bracket.length > 0 && bracket[0].total > 0 && (
        <section className="space-y-3">
          <h2 className="display text-xl text-silver-100">Nereye kadar gider?</h2>
          <div className="panel grid gap-px overflow-hidden bg-white/6 sm:grid-cols-5">
            {bracket.map((b) => {
              const pct = Math.round((b.count / b.total) * 100);
              return (
                <div key={b.round} className="bg-night-850 p-4 text-center">
                  <p className="eyebrow mb-2">{b.label}</p>
                  <p
                    className={cn(
                      "display num text-3xl",
                      b.round === "WINNER" ? "text-gold-400" : "text-silver-100",
                    )}
                  >
                    %{pct}
                  </p>
                  <p className="num mt-1 text-[11px] text-silver-600">
                    {b.count}/{b.total} kişi
                  </p>
                  {b.round === "WINNER" && b.count > 0 && (
                    <Star size={12} className="mx-auto mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
