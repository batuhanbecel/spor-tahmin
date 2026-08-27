import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth-forms";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Giriş yap" };

export default async function GirisPage() {
  const session = await getSession();
  if (session?.user) redirect("/maclar");

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-1 text-xl font-bold">Giriş yap</h1>
        <p className="mb-6 text-sm text-white/50">Tahminlerine kaldığın yerden devam et.</p>
        <SignInForm googleEnabled={googleEnabled} />
      </div>
    </div>
  );
}
