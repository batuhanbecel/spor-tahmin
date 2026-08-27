"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Plus, UserPlus } from "lucide-react";
import { createLeague, joinLeague } from "@/app/actions";

export function CreateLeagueForm() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await createLeague(name);
          setMsg(res);
          if (res.ok) {
            setName("");
            router.refresh();
            if (res.slug) router.push(`/ligler/${res.slug}`);
          }
        });
      }}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Plus className="h-4 w-4 text-star-400" /> Yeni lig kur
      </h2>
      <div>
        <label className="label" htmlFor="league-name">
          Lig adı
        </label>
        <input
          id="league-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ofis Ligi"
          maxLength={40}
        />
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Kuruluyor…" : "Ligi kur"}
      </button>
      {msg && (
        <p className={msg.ok ? "text-sm text-lime-accent" : "text-sm text-amber-accent"}>
          {msg.message}
        </p>
      )}
    </form>
  );
}

export function JoinLeagueForm() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await joinLeague(code);
          setMsg(res);
          if (res.ok) {
            setCode("");
            router.refresh();
            if (res.slug) router.push(`/ligler/${res.slug}`);
          }
        });
      }}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <UserPlus className="h-4 w-4 text-lime-accent" /> Davet koduyla katıl
      </h2>
      <div>
        <label className="label" htmlFor="league-code">
          Davet kodu
        </label>
        <input
          id="league-code"
          className="input font-mono uppercase tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="A1B2C3D"
          maxLength={12}
        />
      </div>
      <button className="btn-accent w-full" disabled={pending}>
        {pending ? "Katılınıyor…" : "Lige katıl"}
      </button>
      {msg && (
        <p className={msg.ok ? "text-sm text-lime-accent" : "text-sm text-amber-accent"}>
          {msg.message}
        </p>
      )}
    </form>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* pano izni yoksa sessizce geç */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-xs tracking-widest hover:bg-white/10"
    >
      {code}
      {copied ? <Check className="h-3.5 w-3.5 text-lime-accent" /> : <Copy className="h-3.5 w-3.5 text-white/40" />}
    </button>
  );
}
