import type { Metadata } from "next";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { getGlobalLeaderboard } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Genel sıralama" };
export const dynamic = "force-dynamic";

export default async function SiralamalarPage() {
  const [rows, session] = await Promise.all([getGlobalLeaderboard(300), getSession()]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="display text-3xl text-silver-100 sm:text-4xl">Genel sıralama</h1>
        <p className="text-sm text-silver-500">
          Maç tahminleri, lig aşaması sıralaması ve bracket puanlarının toplamı.
        </p>
      </header>
      <LeaderboardTable rows={rows} currentUserId={session?.user?.id} />
    </div>
  );
}
