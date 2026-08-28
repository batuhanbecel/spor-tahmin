import { sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import {
  DRAW,
  FD_ALIASES,
  LEAGUE_PHASE_START,
  SEED_MATCH_ID,
  SEED_TEAM_ID,
  drawPairings,
} from "@/data/draw-2026-27";

/** Aksan, noktalama ve kulüp ekleri atılarak karşılaştırılabilir hale getirir. */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o")
    .replace(/\b(fc|cf|sk|sc|as|ss|ssc|kv|fk|afc|club|de|1907)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export type CrestSource = { name: string; shortName?: string | null; crest?: string | null }[];

function buildCrestMap(source: CrestSource): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of source) {
    if (!t.crest) continue;
    map.set(normalise(t.name), t.crest);
    if (t.shortName) map.set(normalise(t.shortName), t.crest);
  }
  return map;
}

function crestFor(key: string, name: string, crests: Map<string, string>): string | null {
  for (const candidate of [name, key, ...(FD_ALIASES[key] ?? [])]) {
    const hit = crests.get(normalise(candidate));
    if (hit) return hit;
  }
  return null;
}

export type SeedResult = { teams: number; matches: number; crestsMatched: number; purged: number };

/**
 * 2026/27 kurasını veritabanına yazar.
 *
 * Önce önceki sezondan kalan her şeyi (pozitif id) siler, sonra 36 takım ve
 * 144 eşleşmeyi negatif id'lerle yazar. Armalar, elde varsa football-data
 * takım listesinden ada göre eşleştirilir.
 *
 * Kullanıcı tahminleri korunur: tohum maçların id'leri sabittir, tekrar
 * çalıştırmak tahminleri silmez.
 */
export async function seedDraw(crestSource: CrestSource = []): Promise<SeedResult> {
  const crests = buildCrestMap(crestSource);

  const idByKey = new Map<string, number>();
  DRAW.forEach((t, i) => idByKey.set(t.key, SEED_TEAM_ID(i)));

  let crestsMatched = 0;
  const teamRows = DRAW.map((t, i) => {
    const crest = crestFor(t.key, t.name, crests);
    if (crest) crestsMatched++;
    return {
      id: SEED_TEAM_ID(i),
      name: t.name,
      shortName: t.name,
      tla: t.tla,
      crest,
      country: t.country,
      pot: t.pot,
    };
  });

  /* 1. Önceki sezondan kalanları temizle ----------------------------- */
  const before = await db.execute(sql`select count(*)::int as c from matches where id > 0`);
  const purged = Number((before.rows as unknown as { c: number }[])[0]?.c ?? 0);
  if (purged) await db.execute(sql`delete from matches where id > 0`);
  await db.execute(sql`delete from teams where id > 0`);

  /* 2. Takımlar ------------------------------------------------------ */
  await db
    .insert(teams)
    .values(teamRows)
    .onConflictDoUpdate({
      target: teams.id,
      set: {
        name: sql`excluded.name`,
        shortName: sql`excluded.short_name`,
        tla: sql`excluded.tla`,
        // Arma kaynağı o gün erişilemezse mevcut armayı silme
        crest: sql`coalesce(excluded.crest, ${teams.crest})`,
        country: sql`excluded.country`,
        pot: sql`excluded.pot`,
      },
    });

  /* 3. Eşleşmeler ---------------------------------------------------- */
  const placeholder = new Date(LEAGUE_PHASE_START);
  const matchRows = drawPairings().map((p, i) => ({
    id: SEED_MATCH_ID(i),
    stage: "LEAGUE_STAGE",
    matchday: null,
    utcDate: placeholder,
    status: "SCHEDULED",
    homeTeamId: idByKey.get(p.homeKey)!,
    awayTeamId: idByKey.get(p.awayKey)!,
    homeTeamPlaceholder: null,
    awayTeamPlaceholder: null,
    homeGoals: null,
    awayGoals: null,
    winner: null,
    updatedAt: new Date(),
  }));

  for (let i = 0; i < matchRows.length; i += 100) {
    await db
      .insert(matches)
      .values(matchRows.slice(i, i + 100))
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          homeTeamId: sql`excluded.home_team_id`,
          awayTeamId: sql`excluded.away_team_id`,
          utcDate: sql`excluded.utc_date`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  return { teams: teamRows.length, matches: matchRows.length, crestsMatched, purged };
}
