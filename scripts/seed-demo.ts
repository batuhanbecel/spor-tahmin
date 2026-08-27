/**
 * Geliştirme için sahte veri üretir: 36 takım + 8 haftalık lig aşaması fikstürü.
 * Gerçek fikstür için `npm run sync` kullanın.
 *
 *   npx tsx scripts/seed-demo.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/db";
import { matches, teams } from "../src/db/schema";

const TEAMS: [string, string, string][] = [
  ["Real Madrid", "RMA", "İspanya"],
  ["Manchester City", "MCI", "İngiltere"],
  ["Bayern München", "FCB", "Almanya"],
  ["Paris Saint-Germain", "PSG", "Fransa"],
  ["Liverpool", "LIV", "İngiltere"],
  ["Internazionale", "INT", "İtalya"],
  ["Borussia Dortmund", "BVB", "Almanya"],
  ["Barcelona", "FCB", "İspanya"],
  ["Arsenal", "ARS", "İngiltere"],
  ["Atlético de Madrid", "ATM", "İspanya"],
  ["Bayer Leverkusen", "B04", "Almanya"],
  ["Atalanta", "ATA", "İtalya"],
  ["Juventus", "JUV", "İtalya"],
  ["Benfica", "SLB", "Portekiz"],
  ["Milan", "MIL", "İtalya"],
  ["PSV", "PSV", "Hollanda"],
  ["Feyenoord", "FEY", "Hollanda"],
  ["Sporting CP", "SCP", "Portekiz"],
  ["Club Brugge", "CLU", "Belçika"],
  ["Şahtar Donetsk", "SHK", "Ukrayna"],
  ["Celtic", "CEL", "İskoçya"],
  ["Chelsea", "CHE", "İngiltere"],
  ["Napoli", "NAP", "İtalya"],
  ["Galatasaray", "GAL", "Türkiye"],
  ["Olympiakos", "OLY", "Yunanistan"],
  ["Newcastle United", "NEW", "İngiltere"],
  ["Marseille", "OM", "Fransa"],
  ["Tottenham Hotspur", "TOT", "İngiltere"],
  ["Ajax", "AJA", "Hollanda"],
  ["Bodø/Glimt", "BOD", "Norveç"],
  ["Slavia Praha", "SLA", "Çekya"],
  ["Kairat Almaty", "KAI", "Kazakistan"],
  ["Copenhagen", "FCK", "Danimarka"],
  ["Union Saint-Gilloise", "USG", "Belçika"],
  ["Villarreal", "VIL", "İspanya"],
  ["Athletic Club", "ATH", "İspanya"],
];

/** 1. hafta 8 Eylül 2026'dan başlayan yaklaşık takvim */
const MATCHDAY_DATES = [
  "2026-09-16",
  "2026-09-30",
  "2026-10-21",
  "2026-11-04",
  "2026-11-25",
  "2026-12-09",
  "2027-01-20",
  "2027-01-27",
];

async function main() {
  const teamRows = TEAMS.map(([name, tla, country], i) => ({
    id: 900_000 + i,
    name,
    shortName: name.split(" ")[0],
    tla,
    crest: null,
    country,
  }));

  await db.insert(teams).values(teamRows).onConflictDoNothing();

  // Circle method: 36 takım, ilk 8 tur
  const ids = teamRows.map((t) => t.id);
  const n = ids.length;
  const rotation = [...ids];
  const fixtures: { md: number; home: number; away: number }[] = [];

  for (let round = 0; round < 8; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      // Ev sahipliğini turlara göre değiştir
      const [home, away] = round % 2 === 0 ? [a, b] : [b, a];
      fixtures.push({ md: round + 1, home, away });
    }
    // Sabit ilk eleman, kalanı döndür
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  const matchRows = fixtures.map((f, i) => {
    const date = new Date(`${MATCHDAY_DATES[f.md - 1]}T${i % 2 === 0 ? "18:45" : "21:00"}:00Z`);
    return {
      id: 950_000 + i,
      stage: "LEAGUE_STAGE",
      matchday: f.md,
      utcDate: date,
      status: "SCHEDULED",
      homeTeamId: f.home,
      awayTeamId: f.away,
      homeTeamPlaceholder: null,
      awayTeamPlaceholder: null,
      homeGoals: null,
      awayGoals: null,
      winner: null,
      updatedAt: new Date(),
    };
  });

  for (let i = 0; i < matchRows.length; i += 100) {
    await db.insert(matches).values(matchRows.slice(i, i + 100)).onConflictDoNothing();
  }

  console.log(`${teamRows.length} takım, ${matchRows.length} maç eklendi.`);
}

main().then(() => process.exit(0));
