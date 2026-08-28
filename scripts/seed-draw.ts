/**
 * 2026/27 kura sonucunu veritabanına yazar.
 *
 *   npm run seed:draw
 *
 * Yaptıkları:
 *   1. Önceki sezondan kalan maç ve takımları temizler
 *   2. 36 takım + 144 eşleşmeyi yazar (negatif id — tohum işareti)
 *   3. Arma URL'lerini football-data'dan ada göre eşleştirir (ağ varsa)
 *
 * Maç takvimi yayınlandığında `npm run sync` bu tohumun tamamını silip
 * gerçek fikstürü koyar.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { matches, settings, teams } from "../src/db/schema";
import {
  DRAW,
  FD_ALIASES,
  LEAGUE_PHASE_START,
  SEED_MATCH_ID,
  SEED_TEAM_ID,
  drawPairings,
} from "../src/data/draw-2026-27";

/** Aksan, noktalama ve kulüp ekleri atılarak karşılaştırılabilir hale getirir. */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ø]/g, "o")
    .replace(/\b(fc|cf|sk|sc|as|ss|ssc|kv|fk|afc|club|de|1907)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** football-data'dan güncel takım listesini çekip ada göre arma haritası kurar. */
async function fetchCrests(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    console.log("FOOTBALL_DATA_TOKEN yok — armalar atlanıyor.");
    return map;
  }

  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/CL/teams", {
      headers: { "X-Auth-Token": token },
    });
    if (!res.ok) {
      console.log(`Arma çekilemedi (HTTP ${res.status}) — armasız devam ediliyor.`);
      return map;
    }
    const data = (await res.json()) as { teams?: { name: string; shortName?: string; crest?: string }[] };
    for (const t of data.teams ?? []) {
      if (!t.crest) continue;
      map.set(normalise(t.name), t.crest);
      if (t.shortName) map.set(normalise(t.shortName), t.crest);
    }
    console.log(`football-data'dan ${map.size} isim/arma eşlemesi alındı.`);
  } catch (err) {
    console.log("Arma çekilemedi:", err instanceof Error ? err.message : err);
  }
  return map;
}

function crestFor(key: string, name: string, crests: Map<string, string>): string | null {
  const candidates = [name, key, ...(FD_ALIASES[key] ?? [])];
  for (const c of candidates) {
    const hit = crests.get(normalise(c));
    if (hit) return hit;
  }
  return null;
}

async function main() {
  const crests = await fetchCrests();

  const idByKey = new Map<string, number>();
  DRAW.forEach((t, i) => idByKey.set(t.key, SEED_TEAM_ID(i)));

  let matched = 0;
  const teamRows = DRAW.map((t, i) => {
    const crest = crestFor(t.key, t.name, crests);
    if (crest) matched++;
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

  /* 1. Eski sezondan kalanları temizle ------------------------------- */
  const before = await db.execute(sql`select count(*)::int as c from matches where id > 0`);
  const stale = Number((before.rows as unknown as { c: number }[])[0]?.c ?? 0);
  if (stale) {
    await db.execute(sql`delete from matches where id > 0`);
    console.log(`${stale} eski sezon maçı silindi.`);
  }
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
        crest: sql`excluded.crest`,
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

  await db
    .insert(settings)
    .values({ key: "fixture_source", value: "draw" })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });

  console.log(`${teamRows.length} takım, ${matchRows.length} eşleşme yazıldı.`);
  console.log(`${matched}/${teamRows.length} takımın arması eşleşti.`);
  if (matched < teamRows.length) {
    console.log("Eşleşmeyenler takvimle birlikte gelecek — o zamana kadar TLA rozeti gösterilir.");
  }
}

main().then(() => process.exit(0));
