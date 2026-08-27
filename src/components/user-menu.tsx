"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Trophy } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function UserMenu({ name, image }: { name: string; image: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors hover:bg-white/10"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-7 w-7 rounded-lg object-cover" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-star-500/25 text-xs font-bold text-star-400">
            {name.slice(0, 1).toLocaleUpperCase("tr")}
          </span>
        )}
        <span className="hidden max-w-28 truncate sm:block">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/12 bg-night-850 shadow-2xl">
          <Link
            href="/profil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/80 hover:bg-white/6"
          >
            <UserIcon className="h-4 w-4" /> Profilim
          </Link>
          <Link
            href="/ligler"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/80 hover:bg-white/6"
          >
            <Trophy className="h-4 w-4" /> Liglerim
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="flex w-full items-center gap-2.5 border-t border-white/8 px-3.5 py-2.5 text-left text-sm text-white/70 hover:bg-white/6"
          >
            <LogOut className="h-4 w-4" /> Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}
