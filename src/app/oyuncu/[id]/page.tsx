import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  bracketPredictions,
  matchPredictions,
  matches,
  standingsPredictions,
  teams,
} from "@/db/schema";
import { Avatar } from "@/components/avatar";
import { TeamCrest } from "@/components/team-badge";
import { Star } from "@/components/starball";
import { getGlobalLeaderboard } from "@/lib/queries";
import { getPublicUser } from "@/lib/insights";
import { cn, displayName, formatDateTime, nowMs, STAGE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const u = await getPublicUser(id);
  return { title: u ? `${displayName(u)} · tahmin karnesi` : "Oyuncu bulunamadı" };
}

export default async function OyuncuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getPublicUser(id);
  if (!user) notFound();

  const now = new Date();

  const [board, allTeams, standings, bracket, preds] = await Promise.all([
    getGlobalLeaderboard(1000),
    db.select().from(teams),
    db.select().from(standingsPredictions).where(eq(standingsPredictions.userId, id)),
    db.select().from(bracketPredictions).where(eq(bracketPredictions.userId, id)),
    db
      .select({
        matchId: matchPredictions.matchId,
        homeGoals: matchPredictions.homeGoals,
        awayGoals: matchPredictions.awayGoals,
        points: matchPredictions.points,
        utcDate: matches.utcDate,
        status: matches.status,
        stage: matches.stage,
        matchday: matches.matchday,
        actualHome: matches.homeGoals,
        actualAway: matches.awayGoals,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
      })
      .from(matchPredictions)
      .innerJoin(matches, eq(matches.id, matchPredictions.matchId))
      .where(and(eq(matchPredictions.userId, id), lte(matches.utcDate, now)))
      .orderBy(desc(matches.utcDate)),
  ]);

  const byId = new Map(allTeams.map((t) => [t.id, t]));
  const row = board.find((r) => r.userId === id);

  // Sıralama tahmini yalnızca lig aşaması başladıktan sonra açılır
  const [firstLeague] = await db
    .select({ utcDate: matches.utcDate })
    .from(matches)
    .where(eq(matches.stage, "LEAGUE_STAGE"))
    .orderBy(asc(matches.utcDate))
    .limit(1);
  const standingsPublic =
    Boolean(firstLeague && firstLeague.utcDate.getTime() <= nowMs()) && standings.length > 0;

  const [firstKo] = await db
    .select({ utcDate: matches.utcDate })
    .from(matches)
    .where(eq(matches.stage, "PLAYOFFS"))
    .orderBy(asc(matches.utcDate))
    .limit(1);
  const bracketPublic =
    Boolean(firstKo && firstKo.utcDate.getTime() <= nowMs()) && bracket.length > 0;

  const picks = bracket[0]?.picks;

  return (
    <div className="space-y-9 py-2">
      {/* ---------------------------------------------------------- başlık */}
      <header className="panel-raised flex flex-wrap items-center gap-5 p-6 sm:p-8">
        <Avatar user={user} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-3xl text-silver-100">{displayName(user)}</h1>
          <p className="mt-1 text-sm text-silver-500">
            {row ? `Klasmanda ${row.rank}. sırada` : "Henüz sıralamada değil"}
          </p>
        </div>
        <div className="flex gap-8">
          <Stat label="Toplam" value={row?.total ?? 0} gold />
          <Stat label="Tahmin" value={row?.predictionCount ?? 0} />
          <Stat label="Tam skor" value={row?.exactCount ?? 0} />
        </div>
      </header>

      {/* ---------------------------------------------------------- sıralama tahmini */}
      <section className="space-y-3">
        <h2 className="display text-lg text-silver-100">Lig aşaması sıralaması</h2>
        {!standingsPublic ? (
          <div className="panel p-6 text-sm text-silver-500">
            {standings.length === 0
              ? "Bu oyuncu sıralama tahmini göndermemiş."
              : "Sıralama tahminleri lig aşaması başlayınca herkese açılır."}
          </div>
        ) : (
          <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {standings[0].order.map((teamId, i) => {
              const t = byId.get(teamId);
              return (
                <li key={teamId}>
                  <Link
                    href={`/takim/${teamId}`}
                    className="panel panel-hover flex items-center gap-2.5 px-3 py-2"
                  >
                    <span
                      className={cn(
                        "num w-7 shrink-0 text-center text-xs font-bold",
                        i < 8 ? "text-gold-400" : i < 24 ? "text-blue-400" : "text-silver-600",
                      )}
                    >
                      {i + 1}
                    </span>
                    <TeamCrest team={t} size={20} />
                    <span className="min-w-0 truncate text-sm text-silver-200">
                      {t?.shortName || t?.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ---------------------------------------------------------- bracket */}
      {bracketPublic && picks && (
        <section className="space-y-3">
          <h2 className="display text-lg text-silver-100">Bracket</h2>
          <div className="panel space-y-4 p-5">
            {(["R16", "QF", "SF", "F"] as const).map((k) => {
              const ids = picks[k] ?? [];
              if (!ids.length) return null;
              const labels: Record<string, string> = {
                R16: "Son 16", QF: "Çeyrek final", SF: "Yarı final", F: "Final",
              };
              return (
                <div key={k}>
                  <p className="eyebrow mb-2">{labels[k]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ids.map((tid) => {
                      const t = byId.get(tid);
                      return (
                        <Link key={tid} href={`/takim/${tid}`} className="chip hover:border-white/25">
                          <TeamCrest team={t} size={14} />
                          {t?.shortName || t?.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {picks.WINNER && (
              <div className="border-t border-white/8 pt-4">
                <p className="eyebrow mb-2 flex items-center gap-1.5">
                  <Star size={11} /> Şampiyon
                </p>
                <Link
                  href={`/takim/${picks.WINNER}`}
                  className="inline-flex items-center gap-2.5 rounded-lg border border-gold-400/40 bg-gold-400/10 px-3 py-2"
                >
                  <TeamCrest team={byId.get(picks.WINNER)} size={26} />
                  <span className="display text-gold-400">
                    {byId.get(picks.WINNER)?.shortName || byId.get(picks.WINNER)?.name}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- maç tahminleri */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="display text-lg text-silver-100">Maç tahminleri</h2>
          <span className="eyebrow">başlamış maçlar</span>
        </div>
        {preds.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-silver-500">
            Açılmış bir tahmini yok.
          </div>
        ) : (
          <div className="panel divide-y divide-white/6 overflow-hidden">
            {preds.map((p) => {
              const h = p.homeTeamId ? byId.get(p.homeTeamId) : undefined;
              const a = p.awayTeamId ? byId.get(p.awayTeamId) : undefined;
              return (
                <Link
                  key={p.matchId}
                  href={`/mac/${p.matchId}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/4 sm:px-5"
                >
                  <span className="chip hidden w-[62px] justify-center sm:inline-flex">
                    {p.stage === "LEAGUE_STAGE" ? `${p.matchday}. hf` : STAGE_LABELS[p.stage]}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <TeamCrest team={h} size={20} />
                    <span className="min-w-0 truncate text-silver-200">{h?.shortName || h?.name}</span>
                    <span className="text-silver-600">—</span>
                    <TeamCrest team={a} size={20} />
                    <span className="min-w-0 truncate text-silver-200">{a?.shortName || a?.name}</span>
                  </div>
                  <span className="num rounded-md bg-white/6 px-2 py-0.5 text-sm font-semibold text-silver-100">
                    {p.homeGoals}-{p.awayGoals}
                  </span>
                  {p.status === "FINISHED" && (
                    <span className="num hidden text-xs text-silver-600 sm:inline">
                      ({p.actualHome}-{p.actualAway})
                    </span>
                  )}
                  <span
                    className={cn(
                      "num w-11 text-right font-bold",
                      p.points == null
                        ? "text-silver-700"
                        : p.points >= 5
                          ? "text-gold-400"
                          : p.points > 0
                            ? "text-blue-400"
                            : "text-silver-600",
                    )}
                  >
                    {p.points == null ? formatDateTime(p.utcDate).slice(0, 6) : `+${p.points}`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={cn("display num text-2xl", gold ? "text-gold-400" : "text-silver-100")}>
        {value}
      </p>
    </div>
  );
}
