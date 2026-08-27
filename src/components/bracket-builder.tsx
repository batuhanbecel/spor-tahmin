"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Lock, Save, Trophy } from "lucide-react";
import { saveBracketPrediction } from "@/app/actions";
import { TeamCrest } from "@/components/team-badge";
import { RULES } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { SortableTeam } from "@/components/standings-sorter";

type RoundKey = "R16" | "QF" | "SF" | "F";

const ROUNDS: { key: RoundKey; label: string; size: number; hint: string }[] = [
  { key: "R16", label: "Son 16", size: 16, hint: "Play-off sonrası son 16'da olacak 16 takım" },
  { key: "QF", label: "Çeyrek Final", size: 8, hint: "Son 16'yı geçecek 8 takım" },
  { key: "SF", label: "Yarı Final", size: 4, hint: "Çeyrek finali geçecek 4 takım" },
  { key: "F", label: "Final", size: 2, hint: "Finali oynayacak 2 takım" },
];

export type BracketPicksState = {
  R16?: number[];
  QF?: number[];
  SF?: number[];
  F?: number[];
  WINNER?: number;
};

export function BracketBuilder({
  teams,
  initial,
  locked,
  signedIn,
  points,
}: {
  teams: SortableTeam[];
  initial: BracketPicksState | null;
  locked: boolean;
  signedIn: boolean;
  points: number | null;
}) {
  const byId = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const [picks, setPicks] = useState<BracketPicksState>(initial ?? {});
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const poolFor = (key: RoundKey): number[] => {
    if (key === "R16") return teams.map((t) => t.id);
    const prev = ROUNDS[ROUNDS.findIndex((r) => r.key === key) - 1].key;
    return picks[prev] ?? [];
  };

  function toggle(key: RoundKey, teamId: number, max: number) {
    if (locked || !signedIn) return;
    setPicks((prev) => {
      const current = prev[key] ?? [];
      const has = current.includes(teamId);
      const next = has ? current.filter((id) => id !== teamId) : [...current, teamId];
      if (!has && next.length > max) return prev;

      const updated: BracketPicksState = { ...prev, [key]: next };
      // Alt turlarda artık geçerli olmayan seçimleri temizle
      const order: RoundKey[] = ["R16", "QF", "SF", "F"];
      const idx = order.indexOf(key);
      let allowed = new Set(next);
      for (let i = idx + 1; i < order.length; i++) {
        const k = order[i];
        const filtered = (updated[k] ?? []).filter((id) => allowed.has(id));
        updated[k] = filtered;
        allowed = new Set(filtered);
      }
      if (updated.WINNER && !(updated.F ?? []).includes(updated.WINNER)) {
        delete updated.WINNER;
      }
      return updated;
    });
    setDirty(true);
    setFeedback(null);
  }

  function setWinner(teamId: number) {
    if (locked || !signedIn) return;
    setPicks((prev) => ({ ...prev, WINNER: prev.WINNER === teamId ? undefined : teamId }));
    setDirty(true);
    setFeedback(null);
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveBracketPrediction(picks);
      setFeedback(res);
      if (res.ok) setDirty(false);
    });
  }

  const finalists = picks.F ?? [];

  return (
    <div className="space-y-6">
      {locked && (
        <div className="panel flex items-center gap-2.5 border-gold-400/25 bg-gold-400/8 p-3.5 text-sm text-gold-400">
          <Lock className="h-4 w-4 shrink-0" />
          Eleme turları başladı, bracket tahmini kilitli.
          {points != null && ` Şu ana kadar ${points} puan.`}
        </div>
      )}

      {ROUNDS.map((round) => {
        const pool = poolFor(round.key);
        const selected = picks[round.key] ?? [];
        const disabled = locked || !signedIn || pool.length === 0;

        return (
          <section key={round.key} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {round.label}
                <span className="ml-2 text-xs font-normal text-silver-500">{round.hint}</span>
              </h2>
              <span
                className={cn(
                  "chip",
                  selected.length === round.size &&
                    "border-gold-400/40 bg-gold-400/12 text-gold-400",
                )}
              >
                {selected.length}/{round.size} seçildi · doğru takım başına +
                {RULES.bracket[round.key]} puan
              </span>
            </div>

            {pool.length === 0 ? (
              <p className="panel p-5 text-sm text-silver-500">
                Önce bir üst turu doldur.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {pool.map((id) => {
                  const team = byId.get(id);
                  if (!team) return null;
                  const on = selected.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(round.key, id, round.size)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                        on
                          ? "border-blue-500 bg-blue-500/15 text-white"
                          : "border-white/10 bg-white/4 text-silver-300 hover:border-white/20 hover:bg-white/8",
                        disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <TeamCrest team={team} size={22} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {team.shortName || team.name}
                      </span>
                      {on && <Check className="h-4 w-4 shrink-0 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-gold-400" /> Şampiyon
          </h2>
          <span className="chip">+{RULES.bracket.WINNER} puan</span>
        </div>
        {finalists.length === 0 ? (
          <p className="panel p-5 text-sm text-silver-500">Önce finalistleri seç.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {finalists.map((id) => {
              const team = byId.get(id);
              if (!team) return null;
              const on = picks.WINNER === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={locked || !signedIn}
                  onClick={() => setWinner(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-5 transition-all",
                    on
                      ? "border-gold-400 bg-gold-400/12"
                      : "border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/8",
                  )}
                >
                  <TeamCrest team={team} size={44} />
                  <span className="text-sm font-semibold">{team.shortName || team.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {!locked && signedIn && (
        <div className="sticky bottom-4 z-30">
          <div className="panel flex items-center justify-between gap-4 border-white/12 bg-night-850/95 p-3 shadow-2xl backdrop-blur-xl">
            <span className="text-sm">
              {feedback ? (
                <span className={feedback.ok ? "text-pitch-400" : "text-flag-400"}>
                  {feedback.message}
                </span>
              ) : dirty ? (
                <span className="text-gold-400">Kaydedilmemiş değişiklik var</span>
              ) : (
                <span className="text-silver-500">Bracket&apos;in güncel</span>
              )}
            </span>
            <button type="button" onClick={save} disabled={pending} className="btn-primary shrink-0">
              <Save className="h-4 w-4" />
              {pending ? "Kaydediliyor…" : "Bracket'i kaydet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
