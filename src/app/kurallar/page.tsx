import type { Metadata } from "next";
import { RULES } from "@/lib/scoring";

export const metadata: Metadata = { title: "Puanlama kuralları" };

export default function KurallarPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <header className="space-y-1">
        <h1 className="display text-3xl text-silver-100 sm:text-4xl">Puanlama kuralları</h1>
        <p className="text-sm text-silver-500">
          Toplam puanın üç bölümün toplamıdır: maç tahminleri, lig aşaması sıralaması ve eleme
          turu bracket&apos;i.
        </p>
      </header>

      <Section title="1 · Maç skoru tahmini">
        <Rule points={RULES.match.exact} label="Tam skor" desc="Her iki takımın gol sayısı da doğru." />
        <Rule
          points={RULES.match.diff}
          label="Doğru gol farkı"
          desc="Kazananı ve gol farkını bildin ama skoru tutturamadın (beraberlikler hariç)."
        />
        <Rule points={RULES.match.outcome} label="Doğru sonuç" desc="Sadece 1-X-2 tuttu." />
        <Rule points={RULES.match.miss} label="Yanlış" desc="Sonuç tutmadı." />
        <p className="text-sm text-silver-500">
          Tahminler maçın başlama saatinde kilitlenir. Ertelenen maçlar yeni tarihine göre yeniden
          açılır.
        </p>
      </Section>

      <Section title="2 · Lig aşaması sıralaması">
        <p className="text-sm text-silver-400">
          Sezon başlamadan 36 takımı 1&apos;den 36&apos;ya dizersin. Her takım için:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-night-900/70 p-4 text-sm text-blue-400">
{`puan = max(0, ${RULES.standings.perfect} − |tahmin sıra − gerçek sıra|)`}
        </pre>
        <Rule
          points={RULES.standings.topEightBonus}
          label="İlk 8 bonusu"
          desc="İlk 8'e koyduğun takım gerçekten ilk 8'de bitirirse takım başına ek puan."
        />
        <Rule
          points={RULES.standings.flawless}
          label="Kusursuz tablo"
          desc="36 sıranın tamamı doğruysa ek ödül."
        />
        <p className="text-sm text-silver-500">
          Sıralama tahmini lig aşamasının ilk maçı başlarken kilitlenir ve lig aşaması bitince
          puanlanır.
        </p>
      </Section>

      <Section title="3 · Eleme turu bracket'i">
        <Rule points={RULES.bracket.R16} label="Son 16'ya kalan her doğru takım" />
        <Rule points={RULES.bracket.QF} label="Çeyrek finale kalan her doğru takım" />
        <Rule points={RULES.bracket.SF} label="Yarı finale kalan her doğru takım" />
        <Rule points={RULES.bracket.F} label="Finale kalan her doğru takım" />
        <Rule points={RULES.bracket.WINNER} label="Şampiyon" />
        <p className="text-sm text-silver-500">
          Bracket, play-off turunun ilk maçında kilitlenir ve turlar ilerledikçe kademeli puanlanır.
        </p>
      </Section>

      <Section title="Eşitlik bozma">
        <p className="text-sm text-silver-400">
          Toplam puan eşitse sırasıyla: daha fazla tam skor, daha fazla tahmin, daha erken kayıt
          tarihi.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="display text-lg text-silver-100">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Rule({ points, label, desc }: { points: number; label: string; desc?: string }) {
  return (
    <div className="panel flex items-start gap-3 p-3.5">
      <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg bg-blue-500/15 text-sm font-bold tabular-nums text-blue-400">
        {points > 0 ? `+${points}` : points}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-silver-500">{desc}</p>}
      </div>
    </div>
  );
}
