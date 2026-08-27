import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matchPredictions, matches, teams } from "@/db/schema";
import { NicknameForm } from "@/components/nickname-form";
import { TeamCrest } from "@/components/team-badge";
import { getBracketPrediction, getGlobalLeaderboard, getStandingsPrediction } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Profilim" };
export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const me = await requireUser();

  const [board, standings, bracket] = await Promise.all([
    getGlobalLeaderboard(1000),
    getStandingsPrediction(me.id),
    getBracketPrediction(me.id),
  ]);

  const myRow = board.find((r) => r.userId === me.id);

  const recent = await db
    .select({
      matchId: matchPredictions.matchId,
      homeGoals: matchPredictions.homeGoals,
      awayGoals: matchPredictions.awayGoals,
      points: matchPredictions.points,
      utcDate: matches.utcDate,
      status: matches.status,
      actualHome: matches.homeGoals,
      actualAway: matches.awayGoals,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matchPredictions)
    .innerJoin(matches, eq(matches.id, matchPredictions.matchId))
    .where(eq(matchPredictions.userId, me.id))
    .orderBy(desc(matches.utcDate))
    .limit(25);

  const allTeams = await db.select().from(teams);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Profilim</h1>
        <p className="text-sm text-white/50">{me.email}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Genel sıra" value={myRow ? `${myRow.rank}.` : "—"} accent />
        <Stat label="Toplam puan" value={myRow?.total ?? 0} />
        <Stat label="Tahmin sayısı" value={myRow?.predictionCount ?? 0} />
        <Stat label="Tam skor" value={myRow?.exactCount ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <NicknameForm current={me.nickname ?? ""} />

        <div className="card space-y-2 p-5">
          <h2 className="text-base font-semibold">Sıralama tahmini</h2>
          {standings ? (
            <p className="text-sm text-white/55">
              {standings.order.length} takım sıralandı.{" "}
              {standings.points != null
                ? `${standings.points} puan aldın.`
                : "Lig aşaması bitince puanlanacak."}
            </p>
          ) : (
            <p className="text-sm text-white/45">Henüz sıralama tahmini yapmadın.</p>
          )}
          <Link href="/siralama" className="btn-ghost w-full">
            Sıralamaya git
          </Link>
        </div>

        <div className="card space-y-2 p-5">
          <h2 className="text-base font-semibold">Bracket</h2>
          {bracket ? (
            <p className="text-sm text-white/55">
              Bracket kaydedildi.{" "}
              {bracket.points != null ? `${bracket.points} puan.` : "Eleme turlarında puanlanacak."}
            </p>
          ) : (
            <p className="text-sm text-white/45">Henüz bracket doldurmadın.</p>
          )}
          <Link href="/bracket" className="btn-ghost w-full">
            Bracket&apos;e git
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
          Son tahminlerim
        </h2>
        {recent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-white/45">
            Henüz maç tahmini yapmadın.{" "}
            <Link href="/maclar" className="text-star-400 hover:underline">
              Hemen başla
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-white/6 overflow-hidden">
            {recent.map((r) => {
              const home = r.homeTeamId ? teamById.get(r.homeTeamId) : undefined;
              const away = r.awayTeamId ? teamById.get(r.awayTeamId) : undefined;
              return (
                <div key={r.matchId} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <TeamCrest team={home} size={20} />
                    <span className="min-w-0 truncate">{home?.shortName || home?.name}</span>
                    <span className="text-white/25">—</span>
                    <TeamCrest team={away} size={20} />
                    <span className="min-w-0 truncate">{away?.shortName || away?.name}</span>
                  </div>
                  <span className="shrink-0 tabular-nums text-white/50">
                    {r.homeGoals}-{r.awayGoals}
                  </span>
                  {r.status === "FINISHED" && (
                    <span className="shrink-0 tabular-nums text-white/35">
                      ({r.actualHome}-{r.actualAway})
                    </span>
                  )}
                  <span
                    className={cn(
                      "w-14 shrink-0 text-right font-semibold tabular-nums",
                      r.points == null
                        ? "text-white/25"
                        : r.points >= 5
                          ? "text-lime-accent"
                          : r.points > 0
                            ? "text-star-400"
                            : "text-white/30",
                    )}
                  >
                    {r.points == null ? formatDateTime(r.utcDate).split(" ")[0] : `+${r.points}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          accent && "text-lime-accent",
        )}
      >
        {value}
      </p>
    </div>
  );
}
