import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { BracketBuilder } from "@/components/bracket-builder";
import type { SortableTeam } from "@/components/standings-sorter";
import { getBracketPrediction } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { formatDateTime, nowMs } from "@/lib/utils";

export const metadata: Metadata = { title: "Eleme turu bracket tahmini" };
export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const session = await getSession();

  const [firstKo] = await db
    .select({ utcDate: matches.utcDate })
    .from(matches)
    .where(eq(matches.stage, "PLAYOFFS"))
    .orderBy(asc(matches.utcDate))
    .limit(1);

  const locked = Boolean(firstKo && firstKo.utcDate.getTime() <= nowMs());

  const leagueMatches = await db.select().from(matches).where(eq(matches.stage, "LEAGUE_STAGE"));
  const ids = new Set<number>();
  for (const m of leagueMatches) {
    if (m.homeTeamId) ids.add(m.homeTeamId);
    if (m.awayTeamId) ids.add(m.awayTeamId);
  }

  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const pool = ids.size ? allTeams.filter((t) => ids.has(t.id)) : allTeams;

  const sortable: SortableTeam[] = pool.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    tla: t.tla,
    crest: t.crest,
    country: t.country,
  }));

  const existing = session?.user ? await getBracketPrediction(session.user.id) : null;

  if (!sortable.length) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <h2 className="text-lg font-semibold">Takımlar henüz yüklenmedi</h2>
        <p className="mt-2 text-sm text-white/50">
          Kura sonrası fikstür otomatik çekildiğinde bracket açılacak.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Eleme turu bracket&apos;i</h1>
        <p className="text-sm text-white/50">
          Turdan tura ilerleyecek takımları seç. Her turda bir önceki turda seçtiğin takımlar
          arasından ilerlersin.
        </p>
        {firstKo && !locked && (
          <p className="text-xs text-amber-accent">
            Son gönderim: {formatDateTime(firstKo.utcDate)} (play-off ilk maçı)
          </p>
        )}
      </header>

      {!session?.user && (
        <div className="card flex flex-col gap-3 border-star-500/25 bg-star-500/8 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/80">Bracket&apos;ini kaydetmek için giriş yapmalısın.</p>
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

      <BracketBuilder
        teams={sortable}
        initial={existing?.picks ?? null}
        locked={locked}
        signedIn={Boolean(session?.user)}
        points={existing?.points ?? null}
      />
    </div>
  );
}
