import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth-forms";
import { AuthError } from "@/components/auth-error";
import { Starball } from "@/components/starball";
import { hasDiscord, hasGoogle } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Giriş" };

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session?.user) redirect("/maclar");

  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="panel-raised relative overflow-hidden p-7 sm:p-9">
        <Starball size={200} className="absolute -right-14 -top-14 opacity-[0.05]" />
        <h1 className="display relative text-2xl text-silver-100">Giriş yap</h1>
        <p className="relative mb-7 mt-1 text-sm text-silver-500">
          Tahminlerine kaldığın yerden devam et.
        </p>
        <div className="relative">
          <AuthError code={error} />
          <SignInForm googleEnabled={hasGoogle} discordEnabled={hasDiscord} />
        </div>
      </div>
    </div>
  );
}
