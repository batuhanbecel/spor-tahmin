import { Starball } from "./starball";
import { cn } from "@/lib/utils";

/**
 * Site markası.
 *
 * NEXT_PUBLIC_BRAND_LOGO tanımlıysa o görsel kullanılır (public/ altındaki bir
 * dosya yolu ya da tam URL). Tanımlı değilse varsayılan yıldız-top çizilir.
 *
 * Kendi logonu koymak için:
 *   1. Dosyayı public/logo.svg (veya .png) olarak ekle
 *   2. NEXT_PUBLIC_BRAND_LOGO="/logo.svg" ortam değişkenini tanımla
 *   3. Favicon için src/app/icon.svg ve src/app/favicon.ico dosyalarını değiştir
 */
export function BrandMark({
  size = 30,
  className,
  tone = "silver",
}: {
  size?: number;
  className?: string;
  tone?: "silver" | "gold" | "blue";
}) {
  // Varsayılan: public/logo.svg (favicon ile aynı çizim).
  // Kendi logonu koymak için public/logo.svg dosyasını değiştirmen yeterli;
  // farklı bir yol istersen NEXT_PUBLIC_BRAND_LOGO ile ez.
  const custom = process.env.NEXT_PUBLIC_BRAND_LOGO?.trim() || "/logo.svg";

  if (custom) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={custom}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return <Starball size={size} className={className} tone={tone} />;
}
