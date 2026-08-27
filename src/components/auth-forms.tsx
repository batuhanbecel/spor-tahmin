"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.35-1.22.645-1.873.891a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.332-.955 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
    </svg>
  );
}

function SocialButtons({
  discord,
  google,
  verb,
}: {
  discord: boolean;
  google: boolean;
  verb: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!discord && !google) return null;

  return (
    <div className="space-y-2.5">
      {discord && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            setBusy("discord");
            signIn.social({ provider: "discord", callbackURL: "/maclar" });
          }}
          className="btn w-full bg-[#5865F2] text-white hover:bg-[#4752c4] active:translate-y-px"
        >
          <DiscordIcon className="h-[18px] w-[18px]" />
          {busy === "discord" ? "Yönlendiriliyor…" : `Discord ile ${verb}`}
        </button>
      )}
      {google && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            setBusy("google");
            signIn.social({ provider: "google", callbackURL: "/maclar" });
          }}
          className="btn-ghost w-full"
        >
          <GoogleIcon className="h-[18px] w-[18px]" />
          {busy === "google" ? "Yönlendiriliyor…" : `Google ile ${verb}`}
        </button>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-white/10" />
      <span className="eyebrow">veya e-posta</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

export function SignInForm({
  googleEnabled,
  discordEnabled,
}: {
  googleEnabled: boolean;
  discordEnabled: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const hasSocial = googleEnabled || discordEnabled;

  return (
    <div className="space-y-5">
      <SocialButtons discord={discordEnabled} google={googleEnabled} verb="giriş yap" />
      {hasSocial && <Divider />}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await signIn.email({ email, password });
            if (res.error) {
              setError(res.error.message ?? "Giriş yapılamadı. Bilgilerini kontrol et.");
              return;
            }
            router.push("/maclar");
            router.refresh();
          });
        }}
      >
        <div>
          <label className="label" htmlFor="email">E-posta</label>
          <input id="email" type="email" required autoComplete="email" className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Şifre</label>
          <input id="password" type="password" required autoComplete="current-password" className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-flag-400">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>

      <p className="text-center text-sm text-silver-500">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="text-blue-400 hover:underline">Ücretsiz katıl</Link>
      </p>
    </div>
  );
}

export function SignUpForm({
  googleEnabled,
  discordEnabled,
}: {
  googleEnabled: boolean;
  discordEnabled: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const hasSocial = googleEnabled || discordEnabled;

  return (
    <div className="space-y-5">
      <SocialButtons discord={discordEnabled} google={googleEnabled} verb="katıl" />
      {hasSocial && <Divider />}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (password.length < 8) {
            setError("Şifre en az 8 karakter olmalı.");
            return;
          }
          start(async () => {
            const res = await signUp.email({ name, email, password });
            if (res.error) {
              setError(res.error.message ?? "Kayıt oluşturulamadı.");
              return;
            }
            router.push("/maclar");
            router.refresh();
          });
        }}
      >
        <div>
          <label className="label" htmlFor="name">Görünen ad</label>
          <input id="name" required minLength={2} maxLength={40} className="input"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Klasmanda görünecek ad" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-posta</label>
          <input id="email" type="email" required autoComplete="email" className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Şifre</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password"
            className="input" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter" />
        </div>
        {error && <p className="text-sm text-flag-400">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Hesap açılıyor…" : "Hesap aç"}
        </button>
      </form>

      <p className="text-center text-sm text-silver-500">
        Zaten üye misin?{" "}
        <Link href="/giris" className="text-blue-400 hover:underline">Giriş yap</Link>
      </p>
    </div>
  );
}
