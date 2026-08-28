import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-night-1000/70">
      <div className="mx-auto flex w-full max-w-shell flex-col gap-4 px-4 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <BrandMark size={26} className="mt-0.5 opacity-45" />
          <p className="max-w-lg text-xs leading-relaxed text-silver-500">
            Tahmin Ligi 2026/27 — bağımsız bir taraftar projesidir, UEFA ile bağlantısı yoktur.
            Maç verileri{" "}
            <a
              href="https://www.football-data.org"
              target="_blank"
              rel="noreferrer noopener"
              className="text-silver-300 underline underline-offset-2 hover:text-silver-100"
            >
              football-data.org
            </a>{" "}
            üzerinden alınır.
          </p>
        </div>
        <nav className="flex gap-5 text-xs text-silver-500">
          <Link href="/kurallar" className="hover:text-silver-100">
            Puanlama
          </Link>
          <Link href="/takimlar" className="hover:text-silver-100">
            Takımlar
          </Link>
          <Link href="/siralamalar" className="hover:text-silver-100">
            Klasman
          </Link>
        </nav>
      </div>
    </footer>
  );
}
