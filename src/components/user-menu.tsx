"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Avatar } from "./avatar";

export function UserMenu({
  name,
  image,
  userId,
}: {
  name: string;
  image: string | null;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/12 bg-white/4 py-1 pl-1 pr-2.5 transition-colors hover:border-white/25 hover:bg-white/8"
      >
        <Avatar user={{ name, image }} size={28} />
        <span className="hidden max-w-28 truncate text-sm text-silver-200 sm:block">{name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/12 bg-night-800 shadow-2xl"
        >
          <Link
            href={`/oyuncu/${userId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-silver-200 hover:bg-white/6"
          >
            <UserRound className="h-4 w-4 text-silver-500" /> Tahmin karnem
          </Link>
          <Link
            href="/profil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-silver-200 hover:bg-white/6"
          >
            <Settings className="h-4 w-4 text-silver-500" /> Ayarlar
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 border-t border-white/8 px-4 py-2.5 text-left text-sm text-silver-400 hover:bg-white/6"
          >
            <LogOut className="h-4 w-4" /> Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}
