import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { CopyCode, CreateLeagueForm, JoinLeagueForm } from "@/components/league-forms";
import { getUserLeagues } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Liglerim" };
export const dynamic = "force-dynamic";

export default async function LiglerPage() {
  const me = await requireUser();
  const leagues = await getUserLeagues(me.id);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Liglerim</h1>
        <p className="text-sm text-white/50">
          Kendi mini ligini kur, davet kodunu paylaş, sadece kendi grubunla yarış.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <CreateLeagueForm />
        <JoinLeagueForm />
      </div>

      {leagues.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
            Üye olduğun ligler
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {leagues.map((l) => (
              <div key={l.id} className="card card-hover flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/ligler/${l.slug}`} className="block truncate font-semibold hover:underline">
                    {l.name}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45">
                    <Users className="h-3.5 w-3.5" />
                    {Number(l.memberCount)} üye
                    {l.ownerId === me.id && " · kurucu sensin"}
                  </p>
                </div>
                <CopyCode code={l.code} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
