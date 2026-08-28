/**
 * 2026/27 kura sonucunu veritabanına yazar.
 *
 *   npm run seed:draw
 *
 * Maç takvimi henüz yayınlanmadığı için tarihler yer tutucudur ve arayüzde
 * gösterilmez. Tohum kayıtları negatif id kullanır; football-data gerçek
 * fikstürü verdiği anda ilk senkron bunların hepsini siler.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { matches, settings, teams } from "../src/db/schema";
import {
  DRAW,
  LEAGUE_PHASE_START,
  SEED_MATCH_ID,
  SEED_TEAM_ID,
  drawPairings,
} from "../src/data/draw-2026-27";

async function main() {
  const idByKey = new Map<string, number>();
  DRAW.forEach((t, i) => idByKey.set(t.key, SEED_TEAM_ID(i)));

  const teamRows = DRAW.map((t, i) => ({
    id: SEED_TEAM_ID(i),
    name: t.name,
    shortName: t.name,
    tla: t.tla,
    crest: null,
    country: t.country,
    pot: t.pot,
  }));

  await db
    .insert(teams)
    .values(teamRows)
    .onConflictDoUpdate({
      target: teams.id,
      set: {
        name: sql`excluded.name`,
        shortName: sql`excluded.short_name`,
        tla: sql`excluded.tla`,
        country: sql`excluded.country`,
        pot: sql`excluded.pot`,
      },
    });

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
  console.log("Takvim yayınlanınca 'npm run sync' bunları gerçek fikstürle değiştirecek.");
}

main().then(() => process.exit(0));
