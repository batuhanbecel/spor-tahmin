import "dotenv/config";
import { syncCompetition } from "../src/lib/sync";

async function main() {
  console.log("football-data.org senkronizasyonu başlıyor…");
  const report = await syncCompetition();
  console.log("Bitti:");
  console.table(report);
}

main().catch((err) => {
  console.error("Senkronizasyon başarısız:", err);
  process.exit(1);
});
