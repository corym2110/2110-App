"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Select } from "@/components/ui/Select";
import { PlusIcon } from "@/components/ui/icons";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useThemeStore } from "@/stores/theme";
import { useAvailabilityStore } from "@/stores/availability";
import { useBookingsStore } from "@/stores/bookings";
import { occurrencesForDate, type Occurrence } from "@/lib/scheduleEngine";
import { addDays, formatDateShort, formatDateLong, isoOf, mondayOf, startOfToday, MONTHS } from "@/lib/time";
import { useMembers } from "@/lib/useMembers";
import { useCoaches } from "@/lib/useCoaches";
import { DayColumn } from "@/components/schedule/DayColumn";
import { MonthGrid } from "@/components/schedule/MonthGrid";
import { DetailPanel } from "@/components/schedule/DetailPanel";
import { BookingDialog } from "@/components/schedule/BookingDialog";
import type { CoachId } from "@/types";

type View = "Day" | "Week" | "Month";
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DragState {
  key: string;
  coach: CoachId;
}

function ScheduleInner() {
  const params = useSearchParams();
  const [view, setView] = useState<View>("Week");
  const [offset, setOffset] = useState(0);
  const [coachFilter, setCoachFilter] = useState<"all" | CoachId>("all");
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [draft, setDraft] = useState<{ iso: string; start: number } | null>(() =>
    params.get("new") ? { iso: isoOf(startOfToday()), start: 540 } : null,
  );
  const [pendingMove, setPendingMove] = useState<{ occurrence: Occurrence; iso: string; start: number } | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [editing, setEditing] = useState<Occurrence | null>(null);

  const dark = useThemeStore((s) => s.theme === "dark");
  const availability = useAvailabilityStore((s) => s.byCoach);
  const { bookings, series, moves, cancellations, move } = useBookingsStore();
  const members = useMembers();
  const coaches = useCoaches();
  const allCoaches = useMemo(() => [{ id: "all", name: "All coaches" }, ...coaches], [coaches]);

  useHeaderAction(
    <HeaderButton onClick={() => setDraft({ iso: isoOf(addDays(startOfToday(), offset)), start: 540 })}>
      <PlusIcon size={15} />
      New session
    </HeaderButton>,
  );

  const today = useMemo(() => startOfToday(), []);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const columns = useMemo(() => {
    if (view === "Day") return [addDays(today, offset)];
    if (view === "Week") return Array.from({ length: 7 }, (_, i) => addDays(mondayOf(today), offset * 7 + i));
    return [];
  }, [view, offset, today]);

  const monthAnchor = useMemo(() => new Date(today.getFullYear(), today.getMonth() + offset, 1), [today, offset]);

  const relevantCoachIds: CoachId[] = coachFilter === "all" ? coaches.map((c) => c.id) : [coachFilter];

  const periodLabel =
    view === "Day"
      ? formatDateLong(columns[0])
      : view === "Week"
        ? `${formatDateShort(columns[0])} – ${formatDateShort(columns[6])}`
        : `${MONTHS[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;

  function occurrencesFor(date: Date): Occurrence[] {
    return occurrencesForDate(date, moves, bookings, series, cancellations).filter((o) => coachFilter === "all" || o.coach === coachFilter);
  }

  function handleDrop(date: Date, startMin: number) {
    if (!dragging) return;
    // Find the dragged occurrence among all currently rendered columns.
    const all = columns.flatMap((d) => occurrencesForDate(d, moves, bookings, series, cancellations));
    const source = all.find((o) => o.key === dragging.key);
    if (!source) {
      setDragging(null);
      return;
    }
    setPendingMove({ occurrence: source, iso: isoOf(date), start: startMin });
    setDragging(null);
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Schedule</h2>
          <div className="text-[13.5px] text-muted">{periodLabel}</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Select
            value={coachFilter}
            onChange={(v) => setCoachFilter(v as "all" | CoachId)}
            options={allCoaches.map((c) => ({ value: c.id, label: c.name }))}
            className="h-9 rounded-[10px] px-2.5 text-[13px]"
          />
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setOffset(0)} className="h-9 rounded-[10px] border border-divider px-3.5 text-[13px] hover:bg-row">
              Today
            </button>
            <button type="button" onClick={() => setOffset((o) => o - 1)} className="grid h-9 w-9 place-items-center rounded-[10px] border border-divider text-muted hover:bg-row hover:text-fg">
              ←
            </button>
            <button type="button" onClick={() => setOffset((o) => o + 1)} className="grid h-9 w-9 place-items-center rounded-[10px] border border-divider text-muted hover:bg-row hover:text-fg">
              →
            </button>
          </div>
          <div className="flex gap-1 rounded-[11px] border border-divider p-1">
            {(["Day", "Week", "Month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v);
                  setOffset(0);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] ${view === v ? "bg-row font-semibold text-fg" : "text-muted"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-shadow flex-1 overflow-hidden rounded-2xl bg-surface">
        {view === "Month" ? (
          <MonthGrid
            monthAnchor={monthAnchor}
            today={today}
            coachFilter={coachFilter}
            onPickDay={(d) => {
              setView("Day");
              setOffset(Math.round((d.getTime() - today.getTime()) / 86400000));
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="grid" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(90px, 1fr))` }}>
              <div />
              {columns.map((d) => (
                <div key={isoOf(d)} className="border-l border-divider px-1.5 py-2">
                  <div className="text-[11px] tracking-wider text-muted uppercase">{DOW[(d.getDay() + 6) % 7]}</div>
                  <div className={`text-base font-medium ${isoOf(d) === isoOf(today) ? "text-accent" : ""}`}>{d.getDate()}</div>
                </div>
              ))}

              <div className="relative">
                {Array.from({ length: 14 }, (_, i) => (
                  <div key={i} className="h-[72px] -translate-y-1.5 px-1.5 text-right text-[10.5px] tabular-nums text-muted">
                    {(() => {
                      const h = 6 + i;
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return `${h12}${h < 12 ? "AM" : "PM"}`;
                    })()}
                  </div>
                ))}
              </div>
              {columns.map((d) => (
                <DayColumn
                  key={isoOf(d)}
                  date={d}
                  occurrences={occurrencesFor(d)}
                  selectedKey={selected?.key ?? null}
                  onSelect={setSelected}
                  onSlotClick={(startMin) => setDraft({ iso: isoOf(d), start: startMin })}
                  availability={availability}
                  relevantCoachIds={relevantCoachIds}
                  dark={dark}
                  onDragStartOccurrence={(o) => setDragging({ key: o.key, coach: o.coach })}
                  onDrop={(startMin) => handleDrop(d, startMin)}
                  showNowLine={isoOf(d) === isoOf(today)}
                  nowMin={nowMin}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <DetailPanel
          occurrence={selected}
          members={members}
          coaches={coaches}
          onClose={() => setSelected(null)}
          onEdit={(o) => {
            setEditing(o);
            setSelected(null);
          }}
        />
      )}
      {draft && <BookingDialog iso={draft.iso} start={draft.start} members={members} coaches={coaches} onClose={() => setDraft(null)} />}
      {editing && (
        <BookingDialog
          iso={editing.iso}
          start={editing.start}
          members={members}
          coaches={coaches}
          editing={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingMove && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && setPendingMove(null)}>
          <div className="popover-shadow flex w-full max-w-[380px] flex-col gap-3.5 rounded-2xl bg-surface p-5">
            <div className="text-lg font-medium tracking-tight">Move session?</div>
            <div className="text-[13.5px] text-muted">
              {pendingMove.occurrence.name || "Group Training"} moves to{" "}
              <span className="text-fg">
                {formatDateShort(new Date(`${pendingMove.iso}T00:00:00`))} at {(() => {
                  const h = Math.floor(pendingMove.start / 60);
                  const m = pendingMove.start % 60;
                  const h12 = h % 12 === 0 ? 12 : h % 12;
                  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
                })()}
              </span>
              .
            </div>
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingMove(null)} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  move(pendingMove.occurrence.key, { iso: pendingMove.iso, start: pendingMove.start });
                  setPendingMove(null);
                  setSelected(null);
                }}
                className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent"
              >
                Move session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <ScheduleInner />
    </Suspense>
  );
}
