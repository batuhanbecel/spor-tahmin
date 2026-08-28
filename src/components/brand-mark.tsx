import { Starball } from "./starball";
import { cn } from "@/lib/utils";

/**
 * Site markası — TEK KAYNAK: public/logo.svg
 *
 * Header, footer ve favicon (layout.tsx içindeki metadata.icons) hepsi aynı
 * dosyayı okur. Logoyu değiştirmek için sadece public/logo.svg dosyasını
 * değiştir; başka hiçbir yere dokunmana gerek yok.
 *
 * Farklı bir yol ya da uzantı istersen NEXT_PUBLIC_BRAND_LOGO ile ezebilirsin
 * (ör. "/logo.png" veya tam bir URL).
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
