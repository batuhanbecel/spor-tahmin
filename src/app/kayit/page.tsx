import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth-forms";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Katıl" };

export default async function KayitPage() {
  const session = await getSession();
  if (session?.user) redirect("/maclar");

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-1 text-xl font-bold">Tahmin ligine katıl</h1>
        <p className="mb-6 text-sm text-white/50">
          Ücretsiz. Skorları tahmin et, arkadaşlarınla yarış.
        </p>
        <SignUpForm googleEnabled={googleEnabled} />
      </div>
    </div>
  );
}
