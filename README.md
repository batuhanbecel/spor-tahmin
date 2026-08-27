# Şampiyonlar Ligi Tahmin Ligi 2026/27

`spor.tavukciftligi.lol` için Next.js 16 tabanlı UCL tahmin platformu.

- **Maç skoru tahmini** — 8 haftalık lig aşaması + tüm eleme turları, maç saatinde otomatik kilit
- **Lig aşaması sıralama tahmini** — 36 takımlık tabloyu sürükle-bırak ile sırala
- **Eleme turu bracket'i** — son 16'dan şampiyona kademeli seçim
- **Tahmin şeffaflığı** — takım sayfasında 8 maçın her biri için "kazanır / berabere / kaybeder"
  dağılımı, kimin hangi sıraya koyduğu, kimin şampiyon dediği
- **Klasman** — üç bölümün toplam puanı, oyuncu başına herkese açık tahmin karnesi

## Stack

| Katman | Seçim |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Veritabanı | Postgres (Neon) + Drizzle ORM |
| Auth | Better Auth (Discord, Google, e-posta/şifre) |
| UI | Tailwind CSS v4, lucide-react, dnd-kit |
| Veri | football-data.org v4 API |
| Deploy | Vercel |

---

## 0. Hızlı kurulum — tek komut

Zip'i açıp klasöre gir, sonra:

```bash
chmod +x setup.sh && ./setup.sh
```

Script sırasıyla: bağımlılıkları kurar → `.env.local` üretir → Neon şemasını uygular →
GitHub'da repo açıp push'lar → Vercel projesini kurar ve GitHub'a bağlar →
env değişkenlerini yazar → production'a deploy eder → `spor.tavukciftligi.lol`
subdomain'ini bağlar → fikstürü çeker.

İki yerde tarayıcı isteyecek: Vercel girişi ve (varsa) GitHub yetkilendirmesi.
Yarıda kalırsa aynı komutu tekrar çalıştır — kaldığı yerden devam eder.

**Ön koşul:** Node.js 20+, git. `gh` CLI kuruluysa repoyu da kendi açar
(`brew install gh && gh auth login`); değilse `github.com/new`'dan boş repo açmanı ister.

---

## 1. Kurulum (elle, adım adım)

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
| `FD_SEASON` | — | **Boş bırak.** Ücretsiz katman sadece güncel sezonu verir |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | — | Boşsa Discord butonu gizlenir |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Boşsa Google butonu gizlenir |
| `CRON_SECRET` | ✓ | `/api/cron/sync` erişim anahtarı |

## 3. Vercel'e deploy

1. Repoyu GitHub'a it, Vercel'de **Import Project** (ya da `./setup.sh`).
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

### Discord ile giriş

[Discord Developer Portal](https://discord.com/developers/applications) → **New Application** →
**OAuth2** sekmesi:

```
Redirects:  https://spor.tavukciftligi.lol/api/auth/callback/discord
```

**Client ID** ve **Client Secret**'ı `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` olarak gir.
Kullanıcının Discord avatarı ve adı otomatik gelir; profil resimleri sitenin her yerinde görünür.

### Google ile giriş

Google Cloud Console → OAuth 2.0 Client ID:

```
Authorized JavaScript origins:  https://spor.tavukciftligi.lol
Authorized redirect URIs:       https://spor.tavukciftligi.lol/api/auth/callback/google
```

### Veri gelmiyorsa

`/api/cron/sync` cevabı kendi teşhisini içerir — `diagnostics.attempts` her API çağrısının
HTTP kodunu ve dönen kayıt sayısını gösterir, `diagnostics.note` de muhtemel sebebi yazar:

```bash
curl "https://spor.tavukciftligi.lol/api/cron/sync?key=CRON_SECRET" | jq .diagnostics
```

- **403** → `FD_SEASON` dolu olabilir; boşalt. Ücretsiz katman sezon filtresini kısıtlar.
- **429** → dakikada 10 istek sınırı; bir dakika bekle.
- **200 ama 0 maç** → kura yeni çekildiyse fikstürün football-data'ya düşmesi birkaç saat sürer.

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

**Görünürlük** — dağılım yüzdeleri (%42 kazanır gibi) her zaman açık; kimin tam olarak ne
yazdığı maç başlayınca açılır. Sıralama tahminleri lig aşaması başlayınca, bracket'ler
play-off başlayınca herkese açık olur. Böylece kimse kopya çekemez.

---

## 5. Proje yapısı

```
src/
  app/
    actions.ts              tüm server action'lar (tahmin kaydetme, profil)
    api/auth/[...all]/      Better Auth handler
    api/cron/sync/          football-data senkronizasyonu (cron endpoint)
    maclar/                 matchday bazlı skor tahmini
    siralama/               36 takımlık sürükle-bırak sıralama
    bracket/                kademeli eleme turu seçimi
    puan-durumu/            gerçek lig aşaması tablosu
    takimlar/               takım listesi
    takim/[id]/             takımın 8 maçında halk ne diyor + sıralama/bracket dağılımı
    mac/[id]/               maç detayı: tahmin dağılımı + kim ne demiş
    oyuncu/[id]/            herkese açık tahmin karnesi
    siralamalar/            klasman
    profil/, kurallar/, giris/, kayit/
  components/               UI bileşenleri
  db/schema.ts              Drizzle şeması
  lib/
    auth.ts / auth-client.ts
    football-data.ts        API istemcisi
    scoring.ts              puanlama kuralları (tek kaynak)
    insights.ts             tahmin dağılımı ve şeffaflık sorguları
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
