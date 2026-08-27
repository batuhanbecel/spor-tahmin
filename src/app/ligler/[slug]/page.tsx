import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CopyCode } from "@/components/league-forms";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { getLeagueBySlug, getLeagueLeaderboard } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);
  return { title: league ? `${league.name} · Lig sıralaması` : "Lig bulunamadı" };
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);
  if (!league) notFound();

  const [rows, session] = await Promise.all([
    getLeagueLeaderboard(league.id),
    getSession(),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/ligler" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Liglerim
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{league.name}</h1>
          <p className="text-sm text-white/50">{rows.length} üye yarışıyor</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/50">
          Davet kodu: <CopyCode code={league.code} />
        </div>
      </header>

      <LeaderboardTable rows={rows} currentUserId={session?.user?.id} />
    </div>
  );
}
