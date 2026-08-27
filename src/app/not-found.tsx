import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto my-16 max-w-lg p-12 text-center">
      <p className="text-5xl font-black text-star-500">404</p>
      <h1 className="mt-3 text-xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-white/50">
        Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
