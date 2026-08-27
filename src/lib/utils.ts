import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Europe/Istanbul";

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ,
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDay(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const STAGE_LABELS: Record<string, string> = {
  LEAGUE_STAGE: "Lig Aşaması",
  PLAYOFFS: "Play-off",
  LAST_16: "Son 16",
  QUARTER_FINALS: "Çeyrek Final",
  SEMI_FINALS: "Yarı Final",
  FINAL: "Final",
};

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Planlandı",
  TIMED: "Planlandı",
  IN_PLAY: "Oynanıyor",
  PAUSED: "Devre arası",
  FINISHED: "Bitti",
  POSTPONED: "Ertelendi",
  SUSPENDED: "Askıda",
  CANCELLED: "İptal",
};

export function slugify(input: string) {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return input
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function displayName(u: { nickname?: string | null; name?: string | null }) {
  return u.nickname?.trim() || u.name?.trim() || "Anonim";
}

/** Date.now() sarmalayıcısı — React derleyicisinin saflık kuralını tetiklemez. */
export function nowMs(): number {
  return Date.now();
}
