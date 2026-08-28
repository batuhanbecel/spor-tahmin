import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Yapılandırma teşhisi. Gizli değerleri ASLA döndürmez — sadece var mı,
 * kaç karakter ve nasıl görünüyor. OAuth ayarlarındaki uyuşmazlıkları
 * bulmak için: /api/diag?key=CRON_SECRET
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  if (secret && url.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const baseURL = process.env.BETTER_AUTH_URL ?? "(tanımsız)";
  const shape = (v?: string) =>
    v ? { var: true, uzunluk: v.length, bas: v.slice(0, 4), son: v.slice(-4) } : { var: false };

  return NextResponse.json({
    /** Better Auth'un kendini nerede sandığı — token takasında bu adres kullanılır */
    baseURL,
    /** Discord'a KAYITLI olması gereken adres, birebir */
    discordRedirectURI: `${baseURL}/api/auth/callback/discord`,
    googleRedirectURI: `${baseURL}/api/auth/callback/google`,
    /** İstediğin sayfanın adresi — baseURL ile aynı olmalı */
    publicAppURL: process.env.NEXT_PUBLIC_APP_URL ?? "(tanımsız)",
    /** Bu istek hangi host'a geldi — baseURL'den farklıysa sorun buradadır */
    requestHost: url.host,
    env: {
      DISCORD_CLIENT_ID: shape(process.env.DISCORD_CLIENT_ID),
      DISCORD_CLIENT_SECRET: shape(process.env.DISCORD_CLIENT_SECRET),
      GOOGLE_CLIENT_ID: shape(process.env.GOOGLE_CLIENT_ID),
      BETTER_AUTH_SECRET: shape(process.env.BETTER_AUTH_SECRET),
      FOOTBALL_DATA_TOKEN: shape(process.env.FOOTBALL_DATA_TOKEN),
      DATABASE_URL: { var: Boolean(process.env.DATABASE_URL) },
      FD_SEASON: process.env.FD_SEASON || "(boş — doğrusu bu)",
    },
    ipuclari: [
      "discordRedirectURI, Discord Developer Portal → OAuth2 → Redirects listesinde birebir aynı olmalı.",
      "baseURL ile requestHost farklıysa BETTER_AUTH_URL yanlış — invalid_code'un en sık sebebi bu.",
      "DISCORD_CLIENT_SECRET uzunluğu 32 civarı olmalı. 18-19 ise yanlışlıkla Client ID yapıştırılmıştır.",
    ],
  });
}
