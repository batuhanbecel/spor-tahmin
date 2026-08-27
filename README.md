# Şampiyonlar Ligi Tahmin Ligi 2026/27

`spor.tavukciftligi.lol` için Next.js 16 tabanlı UCL tahmin platformu.

- **Maç skoru tahmini** — 8 haftalık lig aşaması + tüm eleme turları, maç saatinde otomatik kilit
- **Lig aşaması sıralama tahmini** — 36 takımlık tabloyu sürükle-bırak ile sırala
- **Eleme turu bracket'i** — son 16'dan şampiyona kademeli seçim
- **Arkadaş ligleri** — davet kodlu özel mini ligler
- **Genel sıralama** — üç bölümün toplam puanı

## Stack

| Katman | Seçim |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Veritabanı | Postgres (Neon) + Drizzle ORM |
| Auth | Better Auth (e-posta/şifre + Google) |
| UI | Tailwind CSS v4, lucide-react, dnd-kit |
| Veri | football-data.org v4 API |
| Deploy | Vercel |

---

## 1. Kurulum (yerel)

```bash
npm install
cp .env.example .env.local     # değerleri doldur
npm run db:push                # şemayı veritabanına uygula
npm run sync                   # football-data'dan fikstürü çek
npm run dev
```

Fikstür henüz açıklanmadıysa sahte veriyle çalışmak için:

```bash
npx tsx scripts/seed-demo.ts   # 36 takım + 8 haftalık örnek fikstür
```

## 2. Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | ✓ | Neon Postgres bağlantı adresi |
| `BETTER_AUTH_SECRET` | ✓ | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | ✓ | `https://spor.tavukciftligi.lol` |
| `NEXT_PUBLIC_APP_URL` | ✓ | Aynı adres (istemci tarafı) |
| `FOOTBALL_DATA_TOKEN` | ✓ | football-data.org ücretsiz API anahtarı |
| `FD_SEASON` | — | Varsayılan `2026` (2026/27 sezonu) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Boşsa Google butonu gizlenir |
| `CRON_SECRET` | ✓ | `/api/cron/sync` erişim anahtarı |

## 3. Vercel'e deploy

1. Repoyu GitHub'a it, Vercel'de **Import Project**.
2. **Storage → Neon**: Vercel Marketplace'ten Neon ekle; `DATABASE_URL` otomatik gelir.
3. Yukarıdaki tüm env değişkenlerini Production + Preview için gir.
4. Deploy sonrası şemayı uygula:
   ```bash
   DATABASE_URL="prod-url" npm run db:push
   ```
5. İlk veri çekimi:
   ```bash
   curl "https://spor.tavukciftligi.lol/api/cron/sync?key=CRON_SECRET"
   ```

### Domain bağlama

1. Vercel → Project → **Settings → Domains** → `spor.tavukciftligi.lol` ekle.
2. `tavukciftligi.lol` DNS panelinde:
   ```
   CNAME   spor   cname.vercel-dns.com.
   ```
   (Cloudflare kullanıyorsan proxy'yi **kapat** — turuncu bulut gri olsun.)
3. Sertifika birkaç dakikada otomatik verilir.

### Otomatik senkronizasyon

`vercel.json` günde bir kez `/api/cron/sync` çağırır (Hobby planında cron sınırı günde 1'dir).

Maç günlerinde canlı skor ve anlık puanlama istiyorsan iki seçenek var:

- **Vercel Pro**: `vercel.json` içindeki schedule'ı `*/15 * * * *` yap.
- **Ücretsiz**: [cron-job.org](https://cron-job.org) gibi bir servisten 15 dakikada bir
  `https://spor.tavukciftligi.lol/api/cron/sync?key=CRON_SECRET` adresini çağırt.

> football-data.org ücretsiz katmanı dakikada 10 istek verir; her senkron 2 istek harcar.

### Google ile giriş

Google Cloud Console → OAuth 2.0 Client ID:

```
Authorized JavaScript origins:  https://spor.tavukciftligi.lol
Authorized redirect URIs:       https://spor.tavukciftligi.lol/api/auth/callback/google
```

---

## 4. Puanlama

`src/lib/scoring.ts` tek kaynaktır — değiştirince `/kurallar` sayfası otomatik güncellenir.

**Maç skoru**

| Durum | Puan |
|---|---|
| Tam skor | 5 |
| Doğru gol farkı (beraberlik hariç) | 3 |
| Doğru sonuç (1-X-2) | 2 |
| Yanlış | 0 |

**Lig aşaması sıralaması** — takım başına `max(0, 4 − |tahmin − gerçek|)`, ilk 8'i doğru
bilinen takım başına +2, 36 sıranın tamamı doğruysa +50.

**Bracket** — son 16 +2, çeyrek final +3, yarı final +5, final +8, şampiyon +15 (doğru takım başına).

**Kilitler** — maç tahmini maç saatinde, sıralama tahmini lig aşamasının ilk maçında,
bracket play-off'un ilk maçında kapanır.

---

## 5. Proje yapısı

```
src/
  app/
    actions.ts              tüm server action'lar (tahmin kaydetme, lig kurma…)
    api/auth/[...all]/      Better Auth handler
    api/cron/sync/          football-data senkronizasyonu (cron endpoint)
    maclar/                 matchday bazlı skor tahmini
    siralama/               36 takımlık sürükle-bırak sıralama
    bracket/                kademeli eleme turu seçimi
    puan-durumu/            gerçek lig aşaması tablosu
    ligler/                 arkadaş ligleri + lig detayı
    siralamalar/            genel leaderboard
    profil/, kurallar/, giris/, kayit/
  components/               UI bileşenleri
  db/schema.ts              Drizzle şeması
  lib/
    auth.ts / auth-client.ts
    football-data.ts        API istemcisi
    scoring.ts              puanlama kuralları (tek kaynak)
    standings.ts            puan durumu hesabı
    sync.ts                 veri çekme + otomatik puanlama
    queries.ts              leaderboard ve sayfa sorguları
scripts/
  sync.ts                   CLI senkronizasyon
  seed-demo.ts              geliştirme için sahte fikstür
```

## 6. Komutlar

```bash
npm run dev          # geliştirme
npm run build        # üretim derlemesi
npm run db:push      # şemayı uygula (migration dosyasız)
npm run db:generate  # migration SQL üret
npm run db:studio    # Drizzle Studio
npm run sync         # football-data'dan veri çek + puanla
```

---

UEFA ile resmî bir bağlantısı yoktur. Maç verileri football-data.org üzerinden alınır.
