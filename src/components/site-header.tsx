import Link from "next/link";
import { getSession } from "@/lib/session";
import { displayName } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export const NAV_LINKS = [
  { href: "/maclar", label: "Maçlar" },
  { href: "/siralama", label: "Sıralama Tahmini" },
  { href: "/bracket", label: "Bracket" },
  { href: "/puan-durumu", label: "Puan Durumu" },
  { href: "/ligler", label: "Ligler" },
  { href: "/siralamalar", label: "Genel Sıralama" },
];

export async function SiteHeader() {
  const session = await getSession();
  const u = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-night-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-star-500 to-star-600 text-base font-black text-white shadow-[0_8px_24px_-10px_rgba(63,125,255,0.9)]">
            ŞL
          </span>
          <span className="hidden text-sm font-bold leading-tight sm:block">
            Tahmin Ligi
            <span className="block text-[11px] font-medium text-white/45">2026/27</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-white/6 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {u ? (
            <UserMenu name={displayName(u)} image={u.image ?? null} />
          ) : (
            <>
              <Link href="/giris" className="btn-ghost hidden sm:inline-flex">
                Giriş yap
              </Link>
              <Link href="/kayit" className="btn-primary">
                Katıl
              </Link>
            </>
          )}
          <MobileNav links={NAV_LINKS} signedIn={Boolean(u)} />
        </div>
      </div>
    </header>
  );
}
