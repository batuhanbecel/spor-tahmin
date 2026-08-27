"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNickname } from "@/app/actions";

export function NicknameForm({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="panel space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await updateNickname(value);
          setMsg(res);
          if (res.ok) router.refresh();
        });
      }}
    >
      <h2 className="text-base font-semibold">Takma ad</h2>
      <p className="text-sm text-silver-500">Sıralamalarda bu ad görünür.</p>
      <input
        className="input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={24}
        placeholder="Takma adın"
      />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>
      {msg && (
        <p className={msg.ok ? "text-sm text-pitch-400" : "text-sm text-flag-400"}>
          {msg.message}
        </p>
      )}
    </form>
  );
}
