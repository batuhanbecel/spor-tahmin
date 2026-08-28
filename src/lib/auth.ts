import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const hasGoogle = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
export const hasDiscord = Boolean(
  process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET,
);

export const auth = betterAuth({
  appName: "UCL Tahmin",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  /**
   * Aynı e-postayla hem e-posta/şifre hem sosyal giriş kullanılabilsin.
   *
   * Better Auth varsayılanı `requireLocalEmailVerified: true`. Bizde e-posta
   * doğrulama akışı yok, yani her hesap emailVerified=false. Bu ayar olmadan
   * mevcut bir e-posta hesabı varken Discord'la girmeye çalışmak sessizce
   * "account not linked" hatasına düşüyordu.
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord", "google"],
      requireLocalEmailVerified: false,
    },
  },
  socialProviders: {
    ...(hasDiscord
      ? {
          discord: {
            clientId: process.env.DISCORD_CLIENT_ID as string,
            clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
            // scope varsayılanı zaten ["identify","email"] ve üzerine eklenir —
            // burada tekrar vermek mükerrer istek üretiyordu.
            prompt: "consent",
          },
        }
      : {}),
    ...(hasGoogle
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      nickname: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 gün
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
