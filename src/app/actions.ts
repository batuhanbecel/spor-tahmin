"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import {
  bracketPredictions,
  leagueMembers,
  leagues,
  matchPredictions,
  matches,
  standingsPredictions,
  user,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/utils";

export type ActionState = { ok: boolean; message: string };

/* ------------------------------------------------------------------ */
/*  Maç skoru tahmini                                                  */
/* ------------------------------------------------------------------ */

const savePredictionsSchema = z.object({
  predictions: z
    .array(
      z.object({
        matchId: z.number().int(),
        homeGoals: z.number().int().min(0).max(20),
        awayGoals: z.number().int().min(0).max(20),
      }),
    )
    .max(60),
});

export async function saveMatchPredictions(
  input: z.infer<typeof savePredictionsSchema>,
): Promise<ActionState> {
  const me = await requireUser();
  const parsed = savePredictionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Geçersiz tahmin verisi." };
  if (!parsed.data.predictions.length) return { ok: true, message: "Değişiklik yok." };

  const ids = parsed.data.predictions.map((p) => p.matchId);
  const rows = await db
    .select({ id: matches.id, utcDate: matches.utcDate, status: matches.status })
    .from(matches)
    .where(inArray(matches.id, ids));

  const now = Date.now();
  const open = new Map(
    rows
      .filter((m) => m.utcDate.getTime() > now && m.status !== "FINISHED")
      .map((m) => [m.id, m]),
  );

  const allowed = parsed.data.predictions.filter((p) => open.has(p.matchId));
  const skipped = parsed.data.predictions.length - allowed.length;

  if (allowed.length) {
    await db
      .insert(matchPredictions)
      .values(
        allowed.map((p) => ({
          userId: me.id,
          matchId: p.matchId,
          homeGoals: p.homeGoals,
          awayGoals: p.awayGoals,
        })),
      )
      .onConflictDoUpdate({
        target: [matchPredictions.userId, matchPredictions.matchId],
        set: {
          homeGoals: sql`excluded.home_goals`,
          awayGoals: sql`excluded.away_goals`,
          updatedAt: new Date(),
        },
      });
  }

  revalidatePath("/maclar");
  revalidatePath("/profil");

  if (skipped > 0) {
    return {
      ok: true,
      message: `${allowed.length} tahmin kaydedildi, ${skipped} maç kilitli olduğu için atlandı.`,
    };
  }
  return { ok: true, message: `${allowed.length} tahmin kaydedildi.` };
}

/* ------------------------------------------------------------------ */
/*  Lig aşaması sıralama tahmini                                       */
/* ------------------------------------------------------------------ */

export async function saveStandingsPrediction(order: number[]): Promise<ActionState> {
  const me = await requireUser();
  if (!Array.isArray(order) || order.length === 0) {
    return { ok: false, message: "Sıralama boş olamaz." };
  }
  if (new Set(order).size !== order.length) {
    return { ok: false, message: "Sıralamada tekrar eden takım var." };
  }

  const [first] = await db
    .select({ utcDate: matches.utcDate })
    .from(matches)
    .where(eq(matches.stage, "LEAGUE_STAGE"))
    .orderBy(matches.utcDate)
    .limit(1);

  if (first && first.utcDate.getTime() <= Date.now()) {
    return { ok: false, message: "Lig aşaması başladı, sıralama tahmini kilitli." };
  }

  await db
    .insert(standingsPredictions)
    .values({ userId: me.id, order })
    .onConflictDoUpdate({
      target: standingsPredictions.userId,
      set: { order: sql`excluded."order"`, updatedAt: new Date() },
    });

  revalidatePath("/siralama");
  return { ok: true, message: "Sıralama tahminin kaydedildi." };
}

/* ------------------------------------------------------------------ */
/*  Eleme turu bracket tahmini                                         */
/* ------------------------------------------------------------------ */

const bracketSchema = z.object({
  R16: z.array(z.number().int()).max(16).optional(),
  QF: z.array(z.number().int()).max(8).optional(),
  SF: z.array(z.number().int()).max(4).optional(),
  F: z.array(z.number().int()).max(2).optional(),
  WINNER: z.number().int().optional(),
});

export async function saveBracketPrediction(
  picks: z.infer<typeof bracketSchema>,
): Promise<ActionState> {
  const me = await requireUser();
  const parsed = bracketSchema.safeParse(picks);
  if (!parsed.success) return { ok: false, message: "Geçersiz bracket verisi." };

  const [firstKo] = await db
    .select({ utcDate: matches.utcDate })
    .from(matches)
    .where(eq(matches.stage, "PLAYOFFS"))
    .orderBy(matches.utcDate)
    .limit(1);

  if (firstKo && firstKo.utcDate.getTime() <= Date.now()) {
    return { ok: false, message: "Eleme turları başladı, bracket tahmini kilitli." };
  }

  await db
    .insert(bracketPredictions)
    .values({ userId: me.id, picks: parsed.data })
    .onConflictDoUpdate({
      target: bracketPredictions.userId,
      set: { picks: sql`excluded.picks`, updatedAt: new Date() },
    });

  revalidatePath("/bracket");
  return { ok: true, message: "Bracket tahminin kaydedildi." };
}

/* ------------------------------------------------------------------ */
/*  Arkadaş ligleri                                                    */
/* ------------------------------------------------------------------ */

export async function createLeague(name: string): Promise<ActionState & { slug?: string }> {
  const me = await requireUser();
  const clean = name.trim();
  if (clean.length < 3 || clean.length > 40) {
    return { ok: false, message: "Lig adı 3-40 karakter olmalı." };
  }

  const base = slugify(clean) || "lig";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const [exists] = await db.select({ id: leagues.id }).from(leagues).where(eq(leagues.slug, slug));
    if (!exists) break;
    slug = `${base}-${nanoid(4).toLowerCase()}`;
  }

  const id = nanoid(16);
  const code = nanoid(7).toUpperCase().replace(/[^A-Z0-9]/g, "X");

  await db.insert(leagues).values({ id, name: clean, slug, code, ownerId: me.id });
  await db.insert(leagueMembers).values({ leagueId: id, userId: me.id }).onConflictDoNothing();

  revalidatePath("/ligler");
  return { ok: true, message: "Lig kuruldu.", slug };
}

export async function joinLeague(code: string): Promise<ActionState & { slug?: string }> {
  const me = await requireUser();
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, message: "Davet kodu gerekli." };

  const [league] = await db.select().from(leagues).where(eq(leagues.code, clean));
  if (!league) return { ok: false, message: "Bu koda ait bir lig bulunamadı." };

  await db
    .insert(leagueMembers)
    .values({ leagueId: league.id, userId: me.id })
    .onConflictDoNothing();

  revalidatePath("/ligler");
  return { ok: true, message: `"${league.name}" ligine katıldın.`, slug: league.slug };
}

export async function leaveLeague(leagueId: string): Promise<ActionState> {
  const me = await requireUser();
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league) return { ok: false, message: "Lig bulunamadı." };
  if (league.ownerId === me.id) {
    return { ok: false, message: "Lig kurucusu ligden ayrılamaz." };
  }
  await db
    .delete(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, me.id)));
  revalidatePath("/ligler");
  return { ok: true, message: "Ligden ayrıldın." };
}

/* ------------------------------------------------------------------ */
/*  Profil                                                             */
/* ------------------------------------------------------------------ */

export async function updateNickname(nickname: string): Promise<ActionState> {
  const me = await requireUser();
  const clean = nickname.trim();
  if (clean.length < 2 || clean.length > 24) {
    return { ok: false, message: "Takma ad 2-24 karakter olmalı." };
  }
  await db.update(user).set({ nickname: clean, updatedAt: new Date() }).where(eq(user.id, me.id));
  revalidatePath("/profil");
  revalidatePath("/siralamalar");
  return { ok: true, message: "Takma adın güncellendi." };
}
