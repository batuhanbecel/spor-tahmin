import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { StandingsSorter, type SortableTeam } from "@/components/standings-sorter";
import { getStandingsPrediction } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { RULES } from "@/lib/scoring";
import { formatDateTime, nowMs } from "@/lib/utils";

export const metadata: Metadata = { title: "Lig aşaması sıralama tahmini" };
export const dynamic = "force-dynamic";

export default async function SiralamaPage() {
  const session = await getSession();

  const [firstMatch] = await db
    .select({ utcDate: matches.utcDate })
    .from(matches)
    .where(eq(matches.stage, "LEAGUE_STAGE"))
    .orderBy(asc(matches.utcDate))
    .limit(1);

  const locked = Boolean(firstMatch && firstMatch.utcDate.getTime() <= nowMs());

  // Lig aşamasında yer alan takımlar
  const leagueMatches = await db.select().from(matches).where(eq(matches.stage, "LEAGUE_STAGE"));
  const idsInLeague = new Set<number>();
  for (const m of leagueMatches) {
    if (m.homeTeamId) idsInLeague.add(m.homeTeamId);
    if (m.awayTeamId) idsInLeague.add(m.awayTeamId);
  }

  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const pool = idsInLeague.size ? allTeams.filter((t) => idsInLeague.has(t.id)) : allTeams;

  const sortable: SortableTeam[] = pool.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    tla: t.tla,
    crest: t.crest,
    country: t.country,
  }));

  const existing = session?.user ? await getStandingsPrediction(session.user.id) : null;

  if (!sortable.length) {
    return (
      <EmptyState
        title="Takım listesi henüz yüklenmedi"
        body="Kura sonrası fikstür ve takımlar otomatik olarak çekilecek. Birazdan tekrar dene."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Lig aşaması sıralama tahmini</h1>
        <p className="text-sm text-white/50">
          {sortable.length} takımlık tabloyu sezon başlamadan sırala. Her takım için{" "}
          <strong className="text-white/75">
            {RULES.standings.perfect} − |tahmin − gerçek|
          </strong>{" "}
          puan, ilk 8&apos;i doğru bilinen her takım için ek {RULES.standings.topEightBonus} puan
          kazanırsın.
        </p>
        {firstMatch && !locked && (
          <p className="text-xs text-amber-accent">
            Son gönderim: {formatDateTime(firstMatch.utcDate)} (1. hafta ilk maçı)
          </p>
        )}
      </header>

      {!session?.user && (
        <div className="card flex flex-col gap-3 border-star-500/25 bg-star-500/8 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/80">Sıralamanı kaydetmek için giriş yapmalısın.</p>
          <div className="flex gap-2">
            <Link href="/kayit" className="btn-primary">
              Ücretsiz katıl
            </Link>
            <Link href="/giris" className="btn-ghost">
              Giriş yap
            </Link>
          </div>
        </div>
      )}

      <StandingsSorter
        teams={sortable}
        initialOrder={existing?.order ?? null}
        locked={locked}
        signedIn={Boolean(session?.user)}
        points={existing?.points ?? null}
      />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-white/50">{body}</p>
    </div>
  );
}
