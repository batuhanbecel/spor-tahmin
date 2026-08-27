import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://spor.tavukciftligi.lol";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Şampiyonlar Ligi Tahmin Ligi 2026/27",
    template: "%s · ŞL Tahmin 2026/27",
  },
  description:
    "UEFA Şampiyonlar Ligi 2026/27 sezonu için maç skoru, lig aşaması sıralaması ve eleme turu tahminleri. Arkadaşlarınla lig kur, genel sıralamada yarış.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "ŞL Tahmin 2026/27",
    title: "Şampiyonlar Ligi Tahmin Ligi 2026/27",
    description:
      "Maç skorlarını tahmin et, 36 takımlık lig aşaması tablosunu sırala, bracket'ını kur. Arkadaşlarınla yarış.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#030616",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
