import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth-forms";
import { Starball } from "@/components/starball";
import { hasDiscord, hasGoogle } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Katıl" };

export default async function KayitPage() {
  const session = await getSession();
  if (session?.user) redirect("/maclar");

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="panel-raised relative overflow-hidden p-7 sm:p-9">
        <Starball size={200} className="absolute -right-14 -top-14 opacity-[0.05]" tone="gold" />
        <h1 className="display relative text-2xl text-silver-100">Tahmin ligine katıl</h1>
        <p className="relative mb-7 mt-1 text-sm text-silver-500">
          Ücretsiz. 36 takım, 8 hafta, tek kupa.
        </p>
        <div className="relative">
          <SignUpForm googleEnabled={hasGoogle} discordEnabled={hasDiscord} />
        </div>
      </div>
    </div>
  );
}
