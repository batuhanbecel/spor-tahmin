"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Lock, Save, Shuffle } from "lucide-react";
import { saveStandingsPrediction } from "@/app/actions";
import { TeamCrest } from "@/components/team-badge";
import { cn } from "@/lib/utils";

export type SortableTeam = {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  country: string | null;
};

export function StandingsSorter({
  teams,
  initialOrder,
  locked,
  signedIn,
  points,
}: {
  teams: SortableTeam[];
  initialOrder: number[] | null;
  locked: boolean;
  signedIn: boolean;
  points: number | null;
}) {
  const byId = new Map(teams.map((t) => [t.id, t]));

  const startOrder =
    initialOrder && initialOrder.length
      ? [
          ...initialOrder.filter((id) => byId.has(id)),
          ...teams.map((t) => t.id).filter((id) => !initialOrder.includes(id)),
        ]
      : teams.map((t) => t.id);

  const [order, setOrder] = useState<number[]>(startOrder);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.indexOf(Number(active.id));
      const to = prev.indexOf(Number(over.id));
      return arrayMove(prev, from, to);
    });
    setDirty(true);
    setFeedback(null);
  }

  function move(id: number, delta: number) {
    setOrder((prev) => {
      const from = prev.indexOf(id);
      const to = Math.min(prev.length - 1, Math.max(0, from + delta));
      if (from === to) return prev;
      return arrayMove(prev, from, to);
    });
    setDirty(true);
    setFeedback(null);
  }

  function shuffle() {
    setOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setDirty(true);
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveStandingsPrediction(order);
      setFeedback(res);
      if (res.ok) setDirty(false);
    });
  }

  return (
    <div className="space-y-4">
      {!locked && signedIn && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/50">
            Takımları sürükleyerek 1.&nbsp;sıradan {teams.length}.&nbsp;sıraya diz.
          </p>
          <button type="button" onClick={shuffle} className="btn-ghost text-xs">
            <Shuffle className="h-3.5 w-3.5" /> Karıştır
          </button>
        </div>
      )}

      {locked && (
        <div className="card flex items-center gap-2.5 border-amber-accent/25 bg-amber-accent/8 p-3.5 text-sm text-amber-accent">
          <Lock className="h-4 w-4 shrink-0" />
          Lig aşaması başladığı için sıralama tahmini kilitlendi.
          {points != null && ` Bu tahminden ${points} puan aldın.`}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="card divide-y divide-white/6 overflow-hidden">
            {order.map((id, index) => {
              const team = byId.get(id);
              if (!team) return null;
              return (
                <SortableRow
                  key={id}
                  id={id}
                  index={index}
                  team={team}
                  disabled={locked || !signedIn}
                  onMove={move}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>

      {!locked && signedIn && (
        <div className="sticky bottom-4 z-30">
          <div className="card flex items-center justify-between gap-4 border-white/12 bg-night-850/95 p-3 shadow-2xl backdrop-blur-xl">
            <span className="text-sm">
              {feedback ? (
                <span className={feedback.ok ? "text-lime-accent" : "text-amber-accent"}>
                  {feedback.ok && <Check className="mr-1 inline h-4 w-4" />}
                  {feedback.message}
                </span>
              ) : dirty ? (
                <span className="text-amber-accent">Kaydedilmemiş değişiklik var</span>
              ) : (
                <span className="text-white/50">Sıralaman güncel</span>
              )}
            </span>
            <button type="button" onClick={save} disabled={pending} className="btn-primary shrink-0">
              <Save className="h-4 w-4" />
              {pending ? "Kaydediliyor…" : "Sıralamayı kaydet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableRow({
  id,
  index,
  team,
  disabled,
  onMove,
}: {
  id: number;
  index: number;
  team: SortableTeam;
  disabled: boolean;
  onMove: (id: number, delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const zone =
    index < 8
      ? { label: "Doğrudan son 16", cls: "bg-lime-accent" }
      : index < 24
        ? { label: "Play-off", cls: "bg-star-500" }
        : { label: "Elenir", cls: "bg-white/15" };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 bg-night-900/20 px-2 py-2.5 sm:px-3",
        isDragging && "relative z-10 bg-night-800 shadow-2xl",
      )}
    >
      <span className={cn("h-9 w-1 shrink-0 rounded-full", zone.cls)} title={zone.label} />
      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-white/40">
        {index + 1}
      </span>
      <TeamCrest team={team} size={26} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{team.name}</span>
      <span className="hidden shrink-0 text-xs text-white/30 sm:block">{team.country}</span>

      {!disabled && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Yukarı taşı"
            onClick={() => onMove(id, -1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/8 sm:hidden"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Aşağı taşı"
            onClick={() => onMove(id, 1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/8 sm:hidden"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label="Sürükle"
            className="hidden cursor-grab touch-none text-white/25 hover:text-white/60 active:cursor-grabbing sm:block"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        </div>
      )}
    </li>
  );
}
