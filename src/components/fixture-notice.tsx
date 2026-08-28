import { CalendarClock } from "lucide-react";
import { getFixtureStatus } from "@/lib/sync";
import { formatDateTime } from "@/lib/utils";

/**
 * 2026/27 fikstürü football-data'ya düşene kadar gösterilen şerit.
 * Kura çekildikten sonra sağlayıcının yeni sezona geçmesi birkaç gün sürebiliyor;
 * o aralıkta sayfaların boş görünmesinin sebebini açıkça yazıyoruz.
 */
export async function FixtureNotice() {
  let state: Awaited<ReturnType<typeof getFixtureStatus>>;
  try {
    state = await getFixtureStatus();
  } catch {
    return null;
  }

  if (state.status === "live") return null;

  return (
    <div className="panel flex items-start gap-3 border-gold-400/25 bg-gold-400/8 p-4">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-gold-400">2026/27 fikstürü henüz yayınlanmadı</p>
        <p className="text-silver-400">
          Kura çekildi ama maç takvimi veri sağlayıcısına (football-data.org) daha
          düşmedi. Düştüğü anda otomatik yüklenecek — geçen sezonun fikstürünü
          yanlışlıkla göstermemek için şimdilik boş bırakıyoruz.
        </p>
        {state.lastSync && (
          <p className="num text-xs text-silver-600">
            Son kontrol: {formatDateTime(state.lastSync)}
          </p>
        )}
      </div>
    </div>
  );
}
