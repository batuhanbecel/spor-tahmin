import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-night-950/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Şampiyonlar Ligi Tahmin Ligi 2026/27 — UEFA ile resmî bir bağlantısı yoktur.
          Maç verileri{" "}
          <a
            href="https://www.football-data.org"
            target="_blank"
            rel="noreferrer noopener"
            className="text-white/60 underline underline-offset-2 hover:text-white"
          >
            football-data.org
          </a>{" "}
          üzerinden alınır.
        </p>
        <nav className="flex gap-4">
          <Link href="/kurallar" className="hover:text-white">
            Puanlama kuralları
          </Link>
          <Link href="/siralamalar" className="hover:text-white">
            Genel sıralama
          </Link>
        </nav>
      </div>
    </footer>
  );
}
