import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Lock } from "lucide-react";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { TeamCrest } from "@/components/team-badge";
import { UserChip } from "@/components/avatar";
import { PredictionBar } from "@/components/prediction-bar";
import { getMatchAggregates, getMatchPredictionList } from "@/lib/insights";
import { cn, formatDateTime, hasStarted, STAGE_LABELS, STATUS_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [m] = await db.select().from(matches).where(eq(matches.id, Number(id)));
  if (!m) return { title: "Maç bulunamadı" };
  const ts = await db.select().from(teams);
  const by = new Map(ts.map((t) => [t.id, t]));
  const h = m.homeTeamId ? by.get(m.homeTeamId)?.shortName : null;
  const a = m.awayTeamId ? by.get(m.awayTeamId)?.shortName : null;
  return { title: h && a ? `${h} - ${a} tahminleri` : "Maç tahminleri" };
}

export default async function MacPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) notFound();

  const allTeams = await db.select().from(teams);
  const by = new Map(allTeams.map((t) => [t.id, t]));
  const home = match.homeTeamId ? by.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? by.get(match.awayTeamId) : undefined;

  const started = hasStarted(match);
  const [aggMap, list] = await Promise.all([
    getMatchAggregates([matchId]),
    started ? getMatchPredictionList(matchId) : Promise.resolve([]),
  ]);
  const agg = aggMap.get(matchId);

  const homeLabel = home?.shortName || home?.name || "Ev sahibi";
  const awayLabel = away?.shortName || away?.name || "Deplasman";

  return (
    <div className="space-y-8 py-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip">
          {match.stage === "LEAGUE_STAGE"
            ? `${match.matchday}. hafta`
            : STAGE_LABELS[match.stage]}
        </span>
        <span className="chip">{STATUS_LABELS[match.status] ?? match.status}</span>
        <span className="num text-silver-500">{formatDateTime(match.utcDate)}</span>
      </div>

      {/* ---------------------------------------------------------- skor tablosu */}
      <section className="panel-raised grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-6 sm:gap-8 sm:p-10">
        <Link
          href={home ? `/takim/${home.id}` : "#"}
          className="flex min-w-0 flex-col items-center gap-3 text-center transition-opacity hover:opacity-80"
        >
          <TeamCrest team={home} size={72} />
          <span className="display w-full break-words text-base leading-tight text-silver-100 sm:text-lg">
            {homeLabel}
          </span>
        </Link>

        <div className="text-center">
          {match.status === "FINISHED" ? (
            <p className="display num text-5xl text-silver-100 sm:text-6xl">
              {match.homeGoals}<span className="mx-2 text-silver-600">-</span>{match.awayGoals}
            </p>
          ) : (
            <p className="display text-3xl text-silver-600">vs</p>
          )}
          {agg?.avgHome != null && (
            <p className="num mt-2 text-[11px] text-silver-600">
              ortalama tahmin {agg.avgHome}-{agg.avgAway}
            </p>
          )}
        </div>

        <Link
          href={away ? `/takim/${away.id}` : "#"}
          className="flex min-w-0 flex-col items-center gap-3 text-center transition-opacity hover:opacity-80"
        >
          <TeamCrest team={away} size={72} />
          <span className="display w-full break-words text-base leading-tight text-silver-100 sm:text-lg">
            {awayLabel}
          </span>
        </Link>
      </section>

      {/* ---------------------------------------------------------- dağılım */}
      <section className="space-y-3">
        <h2 className="display text-lg text-silver-100">Tahmin dağılımı</h2>
        <div className="panel space-y-4 p-5">
          <PredictionBar agg={agg} homeLabel={homeLabel} awayLabel={awayLabel} />
          {agg && agg.total > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-white/8 pt-4">
              <span className="chip num">{agg.total} tahmin</span>
              {agg.topScore && (
                <span className="chip num">
                  En çok denen skor: {agg.topScore.home}-{agg.topScore.away} ({agg.topScore.count} kişi)
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- kim ne demiş */}
      <section className="space-y-3">
        <h2 className="display text-lg text-silver-100">Kim ne demiş</h2>

        {!started ? (
          <div className="panel flex items-center gap-3 p-6 text-sm text-silver-400">
            <Lock className="h-4 w-4 shrink-0 text-gold-400" />
            <p>
              Tek tek tahminler maç başladığında açılır — böylece kimse başkasının
              tahminini kopyalayamaz. Yukarıdaki dağılım şimdiden görünür.
            </p>
          </div>
        ) : list.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-silver-500">
            Bu maça kimse tahmin yapmamış.
          </div>
        ) : (
          <div className="panel divide-y divide-white/6 overflow-hidden">
            {list.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 px-5 py-3">
                <UserChip user={p} size={28} className="flex-1 text-sm" />
                <span className="num rounded-md bg-white/6 px-2.5 py-1 text-sm font-semibold text-silver-100">
                  {p.homeGoals}-{p.awayGoals}
                </span>
                <span
                  className={cn(
                    "num w-12 text-right text-sm font-bold",
                    p.points == null
                      ? "text-silver-600"
                      : p.points >= 5
                        ? "text-gold-400"
                        : p.points > 0
                          ? "text-blue-400"
                          : "text-silver-600",
                  )}
                >
                  {p.points == null ? "—" : `+${p.points}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
