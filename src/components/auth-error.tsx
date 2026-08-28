import { AlertTriangle } from "lucide-react";

/** Better Auth'un sosyal giriş hata kodları — Türkçe karşılıkları. */
const MESSAGES: Record<string, string> = {
  account_not_linked:
    "Bu e-postayla açılmış bir hesap zaten var ama sosyal hesabınla bağlı değil. Önce e-posta ve şifrenle giriş yapıp profilinden bağlayabilirsin.",
  email_does_not_match:
    "Sosyal hesabının e-postası mevcut hesabınla eşleşmiyor.",
  email_not_found: "Sağlayıcı e-posta adresi paylaşmadı. Discord hesabında doğrulanmış bir e-posta olmalı.",
  unable_to_create_user: "Hesap oluşturulamadı. Birazdan tekrar dene.",
  state_mismatch: "Oturum doğrulaması başarısız oldu. Sayfayı yenileyip tekrar dene.",
  invalid_state: "Oturum doğrulaması başarısız oldu. Sayfayı yenileyip tekrar dene.",
  please_restart_the_process: "İşlem yarıda kaldı. Baştan dene.",
};

export function AuthError({ code }: { code?: string }) {
  if (!code) return null;
  const key = code.toLowerCase();
  const message =
    MESSAGES[key] ?? `Giriş tamamlanamadı (${code}). Tekrar denemek ister misin?`;

  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-flag-400/30 bg-flag-400/10 p-3.5 text-sm text-silver-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-flag-400" />
      <p>{message}</p>
    </div>
  );
}
