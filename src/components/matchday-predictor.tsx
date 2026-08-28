"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Lock, Save } from "lucide-react";
import { saveMatchPredictions } from "@/app/actions";
import { TeamCrest, teamLabel } from "@/components/team-badge";
import { cn, formatDay, formatTime, nowMs, STATUS_LABELS } from "@/lib/utils";

export type PredictableMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  home: { id: number; name: string; shortName: string | null; tla: string | null; crest: string | null } | null;
  away: { id: number; name: string; shortName: string | null; tla: string | null; crest: string | null } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  prediction: { homeGoals: number; awayGoals: number; points: number | null } | null;
};

type Draft = Record<number, { h: string; a: string }>;

export function MatchdayPredictor({
  matches,
  signedIn,
  grouped = true,
}: {
  matches: PredictableMatch[];
  signedIn: boolean;
  /** false ise gün başlıkları olmadan tek liste (takvim yokken) */
  grouped?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    const d: Draft = {};
    for (const m of matches) {
      d[m.id] = {
        h: m.prediction ? String(m.prediction.homeGoals) : "",
        a: m.prediction ? String(m.prediction.awayGoals) : "",
      };
    }
    return d;
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const [now] = useState(() => nowMs());
  const groups = useMemo(() => {
    if (!grouped) return [["", matches]] as [string, PredictableMatch[]][];
    const map = new Map<string, PredictableMatch[]>();
    for (const m of matches) {
      const key = formatDay(m.utcDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()];
  }, [matches, grouped]);

  const openCount = matches.filter(
    (m) => new Date(m.utcDate).getTime() > now && m.status !== "FINISHED",
  ).length;

  const filledCount = matches.filter((m) => {
    const d = draft[m.id];
    return d && d.h !== "" && d.a !== "";
  }).length;

  /** Hızlı seçim: 1 / X / 2 tıklayınca makul bir skor yazar. */
  function quick(id: number, h: number, a: number) {
    setDraft((prev) => ({ ...prev, [id]: { h: String(h), a: String(a) } }));
    setFeedback(null);
  }

  function set(id: number, side: "h" | "a", value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [side]: clean } }));
  }

  function save() {
    setFeedback(null);
    const payload = matches
      .filter((m) => new Date(m.utcDate).getTime() > now && m.status !== "FINISHED")
      .map((m) => ({ m, d: draft[m.id] }))
      .filter(({ d }) => d && d.h !== "" && d.a !== "")
      .map(({ m, d }) => ({
        matchId: m.id,
        homeGoals: Number(d.h),
        awayGoals: Number(d.a),
      }));

    if (!payload.length) {
      setFeedback({ ok: false, message: "Kaydedilecek tahmin yok." });
      return;
    }

    startTransition(async () => {
      const res = await saveMatchPredictions({ predictions: payload });
      setFeedback(res);
    });
  }

  if (!matches.length) {
    return (
      <div className="panel p-10 text-center text-sm text-silver-500">
        Bu hafta için henüz maç yok. Kura sonrası fikstür otomatik yüklenecek.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!signedIn && (
        <div className="panel flex flex-col gap-3 border-blue-500/25 bg-blue-500/8 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-silver-200">
            Tahminlerini kaydetmek için hesabın olması gerekiyor.
          </p>
          <div className="flex gap-2">
            <Link href="/kayit" className="btn-primary">
              Ücretsiz katıl
            </Link>
            <Link href="/giris" className="btn-ghost">
              Giriş yap
            </Link>
          </div>
        </div>
      )}

      {groups.map(([day, dayMatches]) => (
        <section key={day} className="space-y-2">
          {day && (
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-silver-500">
              {day}
            </h3>
          )}
          <div className="panel divide-y divide-white/6 overflow-hidden">
            {dayMatches.map((m) => {
              const locked = new Date(m.utcDate).getTime() <= now || m.status === "FINISHED";
              const finished = m.status === "FINISHED";
              const d = draft[m.id] ?? { h: "", a: "" };
              return (
                <div key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 sm:gap-4 sm:p-4">
                  {/* Ev sahibi */}
                  <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {m.home ? teamLabel(m.home) : (m.homePlaceholder ?? "Belirsiz")}
                    </span>
                    <TeamCrest team={m.home} size={26} />
                  </div>

                  {/* Skor alanı */}
                  <div className="flex flex-col items-center gap-1">
                    {finished ? (
                      <div className="flex items-center gap-1.5">
                        <ScoreBox value={m.homeGoals ?? 0} tone="result" />
                        <span className="text-silver-600">:</span>
                        <ScoreBox value={m.awayGoals ?? 0} tone="result" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <ScoreInput
                          value={d.h}
                          disabled={locked || !signedIn}
                          onChange={(v) => set(m.id, "h", v)}
                          label={`${m.home?.name ?? "Ev sahibi"} gol tahmini`}
                        />
                        <span className="text-silver-600">:</span>
                        <ScoreInput
                          value={d.a}
                          disabled={locked || !signedIn}
                          onChange={(v) => set(m.id, "a", v)}
                          label={`${m.away?.name ?? "Deplasman"} gol tahmini`}
                        />
                      </div>
                    )}
                    {!finished && !locked && signedIn && (
                      <div className="flex gap-1">
                        {([
                          ["1", 2, 1],
                          ["X", 1, 1],
                          ["2", 1, 2],
                        ] as const).map(([label, h, a]) => {
                          const active = d.h === String(h) && d.a === String(a);
                          return (
                            <button
                              key={label}
                              type="button"
                              aria-label={`${label} — ${h}-${a} yaz`}
                              onClick={() => quick(m.id, h, a)}
                              className={cn(
                                "h-6 w-7 cursor-pointer rounded text-[11px] font-bold transition-colors",
                                active
                                  ? "bg-blue-500 text-white"
                                  : "bg-white/6 text-silver-500 hover:bg-white/12 hover:text-silver-200",
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-medium text-silver-600">
                      {locked && !finished && <Lock className="h-2.5 w-2.5" />}
                      {finished
                        ? STATUS_LABELS[m.status]
                        : grouped
                          ? formatTime(m.utcDate)
                          : "—"}
                    </span>
                  </div>

                  {/* Deplasman */}
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamCrest team={m.away} size={26} />
                    <span className="min-w-0 truncate text-sm font-medium">
                      {m.away ? teamLabel(m.away) : (m.awayPlaceholder ?? "Belirsiz")}
                    </span>
                  </div>

                  {/* Tahmin/puan rozeti */}
                  {m.prediction && (
                    <div className="col-span-3 -mt-1 flex justify-center">
                      <span
                        className={cn(
                          "chip",
                          m.prediction.points != null &&
                            (m.prediction.points >= 5
                              ? "border-gold-400/40 bg-gold-400/12 text-gold-400"
                              : m.prediction.points > 0
                                ? "border-blue-400/40 bg-blue-500/12 text-blue-400"
                                : "border-white/10 text-silver-500"),
                        )}
                      >
                        Tahminin: {m.prediction.homeGoals}-{m.prediction.awayGoals}
                        {m.prediction.points != null && ` · +${m.prediction.points} puan`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {signedIn && openCount > 0 && (
        <div className="sticky bottom-4 z-30">
          <div className="panel flex items-center justify-between gap-4 border-white/12 bg-night-850/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="min-w-0 text-sm">
              {feedback ? (
                <span className={feedback.ok ? "text-pitch-400" : "text-flag-400"}>
                  {feedback.ok && <Check className="mr-1 inline h-4 w-4" />}
                  {feedback.message}
                </span>
              ) : (
                <span className="text-silver-400">
                  {filledCount}/{matches.length} maç dolduruldu
                </span>
              )}
            </div>
            <button type="button" onClick={save} disabled={pending} className="btn-primary shrink-0">
              <Save className="h-4 w-4" />
              {pending ? "Kaydediliyor…" : "Tahminleri kaydet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={value}
      disabled={disabled}
      placeholder="–"
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-11 rounded-xl border border-white/12 bg-night-900/80 text-center text-base font-bold tabular-nums",
        "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    />
  );
}

function ScoreBox({ value }: { value: number; tone?: "result" }) {
  return (
    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/8 text-base font-bold tabular-nums">
      {value}
    </span>
  );
}
