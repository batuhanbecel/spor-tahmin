#!/usr/bin/env bash
#
# spor.tavukciftligi.lol — tek komutluk kurulum (GitHub + Vercel)
#
#   chmod +x setup.sh && ./setup.sh
#
# Yaptıkları:
#   1. Bağımlılıkları kurar, .env.local oluşturur
#   2. Neon veritabanına şemayı uygular
#   3. GitHub'da repo açar ve kodu push'lar
#   4. Vercel projesini kurar, GitHub'a bağlar (push → otomatik deploy)
#   5. Env değişkenlerini yazar ve production'a deploy eder
#   6. spor.tavukciftligi.lol subdomain'ini bağlar
#   7. football-data.org'dan fikstürü çeker
#
set -euo pipefail

BLUE=$'\033[1;34m'; GREEN=$'\033[1;32m'; YELLOW=$'\033[1;33m'; RED=$'\033[1;31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
step() { echo; echo "${BLUE}▸ $*${RESET}"; }
ok()   { echo "${GREEN}  ✓ $*${RESET}"; }
warn() { echo "${YELLOW}  ! $*${RESET}"; }
die()  { echo "${RED}  ✗ $*${RESET}" >&2; exit 1; }

GH_USER="batuhanbecel"
REPO_NAME="spor-tahmin"
PROJECT_NAME="spor-tahmin"
DOMAIN="spor.tavukciftligi.lol"
APP_URL="https://${DOMAIN}"

cd "$(dirname "$0")"

# ---------------------------------------------------------------- 0. ön kontrol
step "Ortam kontrolü"
command -v node >/dev/null || die "Node.js kurulu değil → https://nodejs.org (20+)"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 20+ gerekli (şu an $(node -v))"
command -v git  >/dev/null || die "git kurulu değil"
ok "Node $(node -v), git $(git --version | awk '{print $3}')"

# ---------------------------------------------------------------- 1. yapılandırma
step "Yapılandırma"

DEFAULT_DB="postgresql://neondb_owner:npg_fg7oFj0JcsVQ@ep-flat-recipe-b2kjepgb-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DEFAULT_FD="6f1fd3648c6847cfaba0f1ef0635ef18"

if [ -f .env.local ]; then
  warn ".env.local zaten var — mevcut değerler kullanılacak"
  set -a; . ./.env.local; set +a
else
  IN_DB=""; IN_FD=""
  if [ -t 0 ]; then
    read -r -p "  Neon DATABASE_URL [Enter = kayıtlı değer]: " IN_DB || true
    read -r -p "  football-data.org anahtarı [Enter = kayıtlı değer]: " IN_FD || true
  fi
  DATABASE_URL="${IN_DB:-$DEFAULT_DB}"
  FOOTBALL_DATA_TOKEN="${IN_FD:-$DEFAULT_FD}"

  BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
  CRON_SECRET="$(openssl rand -hex 24)"
  FD_SEASON="2026"

  cat > .env.local <<EOF
DATABASE_URL="${DATABASE_URL}"
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}"
BETTER_AUTH_URL="${APP_URL}"
NEXT_PUBLIC_APP_URL="${APP_URL}"
FOOTBALL_DATA_TOKEN="${FOOTBALL_DATA_TOKEN}"
FD_SEASON="${FD_SEASON}"
CRON_SECRET="${CRON_SECRET}"
EOF
  ok ".env.local yazıldı (.gitignore'da, repoya gitmez)"
fi

: "${DATABASE_URL:?}"; : "${FOOTBALL_DATA_TOKEN:?}"
: "${BETTER_AUTH_SECRET:?}"; : "${CRON_SECRET:?}"
FD_SEASON="${FD_SEASON:-2026}"

# ---------------------------------------------------------------- 2. bağımlılıklar
step "Bağımlılıklar"
npm install --no-fund --no-audit
ok "Kuruldu"

# ---------------------------------------------------------------- 3. veritabanı
step "Neon şeması uygulanıyor"
npm run db:push -- --force
ok "12 tablo hazır"

# ---------------------------------------------------------------- 4. github
step "GitHub"
[ -d .git ] || { git init -q && git add -A && git -c commit.gpgsign=false commit -qm "ilk commit"; }

if git remote get-url origin >/dev/null 2>&1; then
  ok "origin zaten tanımlı: $(git remote get-url origin)"
elif command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh repo create "${GH_USER}/${REPO_NAME}" --public --source=. --remote=origin --push \
    --description "Şampiyonlar Ligi 2026/27 tahmin ligi — ${DOMAIN}"
  ok "Repo açıldı ve push'landı: https://github.com/${GH_USER}/${REPO_NAME}"
else
  warn "gh CLI yok ya da girişli değil."
  echo "  Şu adresten boş bir repo aç (README ekleme):"
  echo "  ${DIM}https://github.com/new  →  ad: ${REPO_NAME}${RESET}"
  if [ -t 0 ]; then read -r -p "  Açtıysan Enter'a bas… " _ || true; fi
  git remote add origin "https://github.com/${GH_USER}/${REPO_NAME}.git"
fi

git add -A
git -c commit.gpgsign=false commit -qm "kurulum" 2>/dev/null || true
git branch -M main
git push -u origin main
ok "Kod GitHub'da"

# ---------------------------------------------------------------- 5. vercel
step "Vercel"
VERCEL="npx --yes vercel@latest"

$VERCEL whoami >/dev/null 2>&1 || { echo "  Tarayıcı açılacak, Vercel'e giriş yap."; $VERCEL login; }
ok "Giriş: $($VERCEL whoami 2>/dev/null)"

$VERCEL link --yes --project "$PROJECT_NAME"
ok "Proje bağlandı: $PROJECT_NAME"

step "GitHub ↔ Vercel bağlantısı"
if $VERCEL git connect --yes; then
  ok "Bağlandı — bundan sonra main'e her push otomatik deploy eder"
else
  warn "Otomatik bağlanamadı (Vercel hesabına GitHub izni gerekiyor olabilir)."
  warn "Dashboard: Project → Settings → Git → Connect Git Repository"
fi

step "Ortam değişkenleri"
put_env() {
  local name="$1" value="$2"
  for e in production preview development; do
    $VERCEL env rm "$name" "$e" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | $VERCEL env add "$name" "$e" --force >/dev/null 2>&1
  done
  echo "    · $name"
}
put_env DATABASE_URL        "$DATABASE_URL"
put_env BETTER_AUTH_SECRET  "$BETTER_AUTH_SECRET"
put_env BETTER_AUTH_URL     "$APP_URL"
put_env NEXT_PUBLIC_APP_URL "$APP_URL"
put_env FOOTBALL_DATA_TOKEN "$FOOTBALL_DATA_TOKEN"
put_env FD_SEASON           "$FD_SEASON"
put_env CRON_SECRET         "$CRON_SECRET"
ok "7 değişken yazıldı"

step "Production deploy (2-4 dk)"
$VERCEL deploy --prod --yes

# ---------------------------------------------------------------- 6. domain
step "Domain: $DOMAIN"
if $VERCEL domains add "$DOMAIN" "$PROJECT_NAME" 2>&1 | tee /tmp/vercel-domain.log; then
  ok "Subdomain projeye bağlandı"
else
  warn "Otomatik bağlanamadı — log: /tmp/vercel-domain.log"
  warn "Dashboard: Project → Settings → Domains → Add"
fi

# ---------------------------------------------------------------- 7. ilk senkron
step "Fikstür çekiliyor"
SYNC_URL="${APP_URL}/api/cron/sync?key=${CRON_SECRET}"
sleep 8
if curl -fsS --max-time 120 "$SYNC_URL" -o /tmp/sync.json 2>/dev/null; then
  cat /tmp/sync.json; echo
  ok "Takımlar ve fikstür yüklendi"
else
  warn "Domain henüz yayılmamış olabilir — birkaç dakika sonra:"
  echo "${DIM}     curl \"${SYNC_URL}\"${RESET}"
  echo "  Alternatif (yerelden): ${DIM}npm run sync${RESET}"
fi

# ---------------------------------------------------------------- bitti
cat <<EOF

${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}
${GREEN}  Yayında:  ${APP_URL}${RESET}
${GREEN}  Repo:     https://github.com/${GH_USER}/${REPO_NAME}${RESET}
${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}

  Bundan sonra kod değişikliği:  ${DIM}git push${RESET}  → otomatik deploy

  ${DIM}Manuel senkron: curl "${SYNC_URL}"${RESET}
  ${DIM}CRON_SECRET .env.local içinde saklı.${RESET}

EOF
