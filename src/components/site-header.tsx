import Link from "next/link";
import { getSession } from "@/lib/session";
import { displayName } from "@/lib/utils";
import { BrandMark } from "./brand-mark";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export const NAV_LINKS = [
  { href: "/maclar", label: "Maçlar" },
  { href: "/siralama", label: "Sıralama" },
  { href: "/bracket", label: "Bracket" },
  { href: "/takimlar", label: "Takımlar" },
  { href: "/puan-durumu", label: "Puan Durumu" },
  { href: "/siralamalar", label: "Klasman" },
];

export async function SiteHeader() {
  const session = await getSession();
  const u = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-night-1000/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] w-full max-w-shell items-center gap-5 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <BrandMark size={30} className="transition-transform group-hover:rotate-[22deg]" />
          <span className="hidden leading-none sm:block">
            <span className="display block text-[15px] text-silver-100">Tahmin Ligi</span>
            <span className="block pt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-silver-500">
              2026/27
            </span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="display rounded-md px-3 py-2 text-[13px] text-silver-400 transition-colors hover:bg-white/6 hover:text-silver-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {u ? (
            <UserMenu name={displayName(u)} image={u.image ?? null} userId={u.id} />
          ) : (
            <>
              <Link href="/giris" className="btn-ghost hidden text-[13px] sm:inline-flex">
                Giriş
              </Link>
              <Link href="/kayit" className="btn-primary text-[13px]">
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
