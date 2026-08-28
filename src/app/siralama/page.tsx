import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { StandingsSorter, type SortableTeam } from "@/components/standings-sorter";
import { getStandingsPrediction } from "@/lib/queries";
import { FixtureNotice } from "@/components/fixture-notice";
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
        <h1 className="display text-3xl text-silver-100 sm:text-4xl">Lig aşaması sıralama tahmini</h1>
        <p className="text-sm text-silver-500">
          {sortable.length} takımlık tabloyu sezon başlamadan sırala. Her takım için{" "}
          <strong className="text-silver-200">
            {RULES.standings.perfect} − |tahmin − gerçek|
          </strong>{" "}
          puan, ilk 8&apos;i doğru bilinen her takım için ek {RULES.standings.topEightBonus} puan
          kazanırsın.
        </p>
        {firstMatch && !locked && (
          <p className="text-xs text-gold-400">
            Son gönderim: {formatDateTime(firstMatch.utcDate)} (1. hafta ilk maçı)
          </p>
        )}
      </header>

      {!session?.user && (
        <div className="panel flex flex-col gap-3 border-blue-500/25 bg-blue-500/8 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-silver-200">Sıralamanı kaydetmek için giriş yapmalısın.</p>
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

      <FixtureNotice />

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
    <div className="panel mx-auto max-w-lg p-10 text-center">
      <h2 className="display text-lg text-silver-100">{title}</h2>
      <p className="mt-2 text-sm text-silver-500">{body}</p>
    </div>
  );
}
