/**
 * Kurayı elle tohumlamak için CLI. Normalde gerek yok:
 * /api/cron/sync takvim gelmediğini görünce bunu kendisi çalıştırıyor.
 *
 *   npm run seed:draw
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { seedDraw } from "../src/lib/seed-draw";

async function fetchTeamsForCrests() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/CL/teams", {
      headers: { "X-Auth-Token": token },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { teams?: { name: string; shortName?: string; crest?: string }[] };
    return data.teams ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const source = await fetchTeamsForCrests();
  const r = await seedDraw(source);
  console.log(`${r.teams} takım, ${r.matches} eşleşme yazıldı.`);
  console.log(`${r.crestsMatched}/${r.teams} arma eşleşti.`);
  if (r.purged) console.log(`${r.purged} eski sezon maçı silindi.`);
}

main().then(() => process.exit(0));
