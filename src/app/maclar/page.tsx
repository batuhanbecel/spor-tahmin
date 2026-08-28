import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { MatchdayPredictor, type PredictableMatch } from "@/components/matchday-predictor";
import { getNextMatchday, getUserPredictions } from "@/lib/queries";
import { FixtureNotice } from "@/components/fixture-notice";
import { getSession } from "@/lib/session";
import { cn, STAGE_LABELS } from "@/lib/utils";

export const metadata: Metadata = { title: "Maçlar ve skor tahminleri" };
export const dynamic = "force-dynamic";

const KO_STAGES = ["PLAYOFFS", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"] as const;

export default async function MaclarPage({
  searchParams,
}: {
  searchParams: Promise<{ hafta?: string; tur?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();

  const allTeams = await db.select().from(teams);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  const stageParam = sp.tur && KO_STAGES.includes(sp.tur as (typeof KO_STAGES)[number]) ? sp.tur : null;

  const defaultMatchday = await getNextMatchday();
  const matchday = stageParam ? null : Number(sp.hafta ?? defaultMatchday) || defaultMatchday;

  const rows = stageParam
    ? await db.select().from(matches).where(eq(matches.stage, stageParam)).orderBy(asc(matches.utcDate))
    : await db
        .select()
        .from(matches)
        .where(eq(matches.stage, "LEAGUE_STAGE"))
        .orderBy(asc(matches.utcDate))
        .then((all) => all.filter((m) => m.matchday === matchday));

  const preds = session?.user
    ? await getUserPredictions(session.user.id, rows.map((m) => m.id))
    : [];
  const predByMatch = new Map(preds.map((p) => [p.matchId, p]));

  const mapTeam = (id: number | null) => {
    if (id == null) return null;
    const t = teamById.get(id);
    if (!t) return null;
    return { id: t.id, name: t.name, shortName: t.shortName, tla: t.tla, crest: t.crest };
  };

  const data: PredictableMatch[] = rows.map((m) => {
    const p = predByMatch.get(m.id);
    return {
      id: m.id,
      utcDate: m.utcDate.toISOString(),
      status: m.status,
      stage: m.stage,
      home: mapTeam(m.homeTeamId),
      away: mapTeam(m.awayTeamId),
      homePlaceholder: m.homeTeamPlaceholder,
      awayPlaceholder: m.awayTeamPlaceholder,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      prediction: p ? { homeGoals: p.homeGoals, awayGoals: p.awayGoals, points: p.points } : null,
    };
  });

  const availableStages = await db
    .selectDistinct({ stage: matches.stage })
    .from(matches)
    .then((r) => new Set(r.map((x) => x.stage)));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="display text-3xl text-silver-100 sm:text-4xl">Maçlar</h1>
        <p className="text-sm text-silver-500">
          Her maç için skor tahmini gir. Tahminler maçın başlama saatinde kilitlenir.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((md) => (
          <Link
            key={md}
            href={`/maclar?hafta=${md}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              !stageParam && matchday === md
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-white/12 bg-white/5 text-silver-300 hover:bg-white/10",
            )}
          >
            {md}. hafta
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-white/10" />
        {KO_STAGES.filter((s) => availableStages.has(s)).map((s) => (
          <Link
            key={s}
            href={`/maclar?tur=${s}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              stageParam === s
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-white/12 bg-white/5 text-silver-300 hover:bg-white/10",
            )}
          >
            {STAGE_LABELS[s]}
          </Link>
        ))}
      </div>

      <FixtureNotice />

      <MatchdayPredictor matches={data} signedIn={Boolean(session?.user)} />
    </div>
  );
}
