import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://spor.tavukciftligi.lol";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tahmin Ligi · Avrupa'nın en büyük kupası 2026/27",
    template: "%s · Tahmin Ligi",
  },
  description:
    "36 takım, 8 hafta, tek kupa. Maç skorlarını tahmin et, lig aşaması tablosunu baştan sırala, bracket'ini kur. Kimin ne dediğini gör.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "Tahmin Ligi 2026/27",
    title: "Tahmin Ligi · Avrupa'nın en büyük kupası 2026/27",
    description:
      "Maç skorlarını tahmin et, 36 takımlık tabloyu sırala, bracket'ini kur. Kimin ne dediğini gör.",
  },
  robots: { index: true, follow: true },
  /**
   * Marka tek dosyadan yönetilir: public/logo.svg
   * Header, footer ve favicon üçü de bunu okur — değiştirmen yeterli.
   */
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#04070f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <div className="sky" aria-hidden="true" />
        <SiteHeader />
        <main className="mx-auto w-full max-w-shell flex-1 px-4 pb-24 pt-6 sm:px-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
