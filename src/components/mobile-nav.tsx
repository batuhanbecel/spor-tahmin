"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({
  links,
  signedIn,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Menü"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/5 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-night-1000/95 backdrop-blur-lg lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-sm font-bold">Menü</span>
            <button
              type="button"
              aria-label="Kapat"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-4 pt-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3.5 text-base font-medium text-silver-200 hover:bg-white/6"
              >
                {l.label}
              </Link>
            ))}
            {!signedIn && (
              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-xl px-4 py-3.5 text-base font-medium text-blue-400 hover:bg-white/6"
              >
                Giriş yap
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
