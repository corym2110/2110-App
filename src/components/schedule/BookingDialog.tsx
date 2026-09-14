"use client";

import { useMemo, useState, useTransition } from "react";
import { capacityOf } from "@/data/mock/sessionTypes";
import { useSessionTypes } from "@/lib/useSessionTypes";
import { useAvailabilityForCoaches } from "@/lib/useCoachAvailability";
import { addBooking, addSeries, cancelOccurrence, type Occurrence } from "@/server/schedule";
import { offReason } from "@/lib/availability";
import { addDays, clock, dowIndex, DOW_LABELS, formatDateLong, isoOf } from "@/lib/time";
import type { CoachRow } from "@/server/coaches";
import type { CoachId, DayOfWeek, Member, SessionTypeName } from "@/types";
import { XIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { Combobox } from "@/components/ui/Combobox";

const TIME_OPTIONS: number[] = (() => {
  const out: number[] = [];
  for (let m = 360; m < 1200; m += 5) out.push(m);
  return out;
})();

export function BookingDialog({
  iso,
  start,
  onClose,
  onSaved,
  members,
  coaches,
  dayOccurrences,
  editing,
}: {
  iso: string;
  start: number;
  onClose: () => void;
  onSaved: () => void;
  members: Member[];
  coaches: CoachRow[];
  dayOccurrences: Occurrence[];
  editing?: Occurrence;
}) {
  const sessionTypes = useSessionTypes();
  const [type, setType] = useState<SessionTypeName>(editing?.type ?? "Personal Training");
  // Coaches can still be loading when this dialog first opens; falling back to coaches[0] here
  // (rather than only at mount) means we still land on a real coach once they arrive, instead of
  // silently submitting with no coach selected at all.
  const [chosenCoach, setCoach] = useState<CoachId>(editing?.coach ?? "");
  const coach = chosenCoach || coaches[0]?.id || "";
  const [time, setTime] = useState(editing?.start ?? start);
  const [client, setClient] = useState(editing?.name ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isPending, startTransition] = useTransition();

  const availByCoach = useAvailabilityForCoaches([coach]);

  const date = useMemo(() => new Date(`${iso}T00:00:00`), [iso]);

  const [recur, setRecur] = useState(false);
  /** Selected recurring days, each with its own start time (minutes from midnight). */
  const [recurDays, setRecurDays] = useState<Partial<Record<DayOfWeek, number>>>(() => ({
    [DOW_LABELS[dowIndex(date)]]: editing?.start ?? start,
  }));
  const [endMode, setEndMode] = useState<"never" | "weeks">("never");
  const [endWeeks, setEndWeeks] = useState(12);

  function toggleRecurDay(d: DayOfWeek) {
    setRecurDays((r) => {
      if (r[d] != null) {
        const next = { ...r };
        delete next[d];
        return next;
      }
      return { ...r, [d]: time };
    });
  }

  const selectedDef = sessionTypes.find((t) => t.name === type);
  const duration = selectedDef?.duration ?? 60;
  const warn = offReason(availByCoach[coach], date, time, duration);
  const cap = capacityOf(type, client.trim(), selectedDef?.capacity ?? 0);
  const existing = dayOccurrences.filter((o) => o.start === time && o.coach === coach && o.type === type && o.key !== editing?.key);
  const head = existing.reduce((a, o) => a + (o.roster?.length ?? 1), 0);
  const full = cap > 0 && head >= cap;

  const canRecur = !editing && (selectedDef?.recurring ?? false);
  const selectedDays = DOW_LABELS.filter((d) => recurDays[d] != null);
  const recurReady = !recur || selectedDays.length > 0;

  function confirm() {
    if (!coach) return;
    if (!client.trim() && type !== "Group Training" && type !== "Class") return;
    if (recur && canRecur && selectedDays.length === 0) return;

    startTransition(async () => {
      const capacity = selectedDef?.capacity ?? 0;

      if (editing) {
        // Cancel the original (deletes a one-off booking outright, or excludes just this date
        // from its recurring series) then create the edited version as a fresh one-off booking.
        await cancelOccurrence(editing.sourceId, editing.key);
        await addBooking({ iso, start: time, duration, type, capacity, coachId: coach, name: client.trim() });
        onSaved();
        onClose();
        return;
      }

      if (recur && canRecur) {
        await addSeries({
          clientName: client.trim(),
          type,
          capacity,
          coachId: coach,
          duration,
          days: recurDays,
          fromIso: iso,
          toIso: endMode === "weeks" ? isoOf(addDays(date, endWeeks * 7)) : undefined,
        });
      } else {
        await addBooking({ iso, start: time, duration, type, capacity, coachId: coach, name: client.trim() });
      }
      onSaved();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[90vh] w-full max-w-[420px] flex-col gap-3.5 overflow-y-auto rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">{editing ? "Edit session" : "New session"}</div>
            <div className="text-[13px] text-muted">
              {formatDateLong(date)} · {clock(time)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Session type</span>
          <Select
            value={type}
            onChange={(v) => setType(v as SessionTypeName)}
            options={sessionTypes.map((t) => ({ value: t.name, label: `${t.name} · ${t.duration} min` }))}
            className="h-10 rounded-lg px-2.5 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Coach</span>
            <Select
              value={coach}
              onChange={(v) => setCoach(v as CoachId)}
              options={coaches.map((c) => ({ value: c.id, label: c.name }))}
              className="h-10 rounded-lg px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Start time</span>
            <Select
              value={String(time)}
              onChange={(v) => setTime(Number(v))}
              options={TIME_OPTIONS.map((t) => ({ value: String(t), label: clock(t) }))}
              className="h-10 rounded-lg px-2.5 text-sm"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Client</span>
          <Combobox
            value={client}
            onChange={setClient}
            options={members.map((m) => m.name)}
            placeholder={type === "Group Training" || type === "Class" ? "Optional title" : "Start typing a name…"}
            className="h-10 w-full rounded-lg px-2.5 text-sm"
          />
        </label>

        {canRecur && (
          <div className="flex flex-col gap-3 rounded-xl border border-divider p-3">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={recur} onChange={(e) => setRecur(e.target.checked)} className="h-4 w-4" />
              Repeat this session
            </label>

            {recur && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] tracking-wider text-muted uppercase">Repeat on</span>
                  <div className="flex flex-col gap-1.5">
                    {DOW_LABELS.map((d) => {
                      const active = recurDays[d] != null;
                      return (
                        <div key={d} className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleRecurDay(d)}
                            className={`h-8 w-12 flex-none rounded-lg border text-[11.5px] ${
                              active ? "border-accent bg-row font-semibold text-fg" : "border-divider text-muted"
                            }`}
                          >
                            {d}
                          </button>
                          {active && (
                            <Select
                              value={String(recurDays[d])}
                              onChange={(v) => setRecurDays((r) => ({ ...r, [d]: Number(v) }))}
                              options={TIME_OPTIONS.map((t) => ({ value: String(t), label: clock(t) }))}
                              className="h-8 flex-1 rounded-lg px-2 text-[12px]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!recurReady && <div className="text-[12px] text-bad">Pick at least one day.</div>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] tracking-wider text-muted uppercase">Ends</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEndMode("never")}
                      className={`h-8 flex-none rounded-full border px-3 text-[12.5px] ${endMode === "never" ? "border-accent bg-row font-semibold" : "border-divider text-muted"}`}
                    >
                      No end date
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndMode("weeks")}
                      className={`h-8 flex-none rounded-full border px-3 text-[12.5px] ${endMode === "weeks" ? "border-accent bg-row font-semibold" : "border-divider text-muted"}`}
                    >
                      After
                    </button>
                    {endMode === "weeks" && (
                      <>
                        <input
                          type="number"
                          min={1}
                          max={104}
                          value={endWeeks}
                          onChange={(e) => setEndWeeks(Math.min(104, Math.max(1, Number(e.target.value) || 1)))}
                          className="h-8 w-14 rounded-md border border-divider bg-transparent px-2 text-[12.5px] tabular-nums"
                        />
                        <span className="text-[12.5px] text-muted">weeks</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {warn && (
          <div className="rounded-lg bg-amber-500/15 px-3 py-2.5 text-[12.5px] text-amber-700 dark:text-amber-300">
            {coaches.find((c) => c.id === coach)?.name ?? "This coach"} isn&apos;t working then: {warn}. You can still book — it&apos;s the coach&apos;s call.
          </div>
        )}
        {full && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">This slot is already full ({head} of {cap}).</div>}

        {editing && confirmCancel && (
          <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">
            Cancel this session? It will be removed from the calendar.
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await cancelOccurrence(editing.sourceId, editing.key);
                    onSaved();
                    onClose();
                  });
                }}
                className="h-8 rounded-full bg-bad px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
              >
                Yes, cancel it
              </button>
              <button type="button" onClick={() => setConfirmCancel(false)} className="h-8 rounded-full border border-divider px-3.5 text-[12.5px] hover:bg-row">
                Never mind
              </button>
            </div>
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-2">
          {editing ? (
            <button type="button" onClick={() => setConfirmCancel(true)} className="h-10 rounded-full border border-bad/40 px-4 text-[13.5px] font-medium text-bad hover:bg-bad/10">
              Cancel session
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
              Close
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!recurReady || isPending || !coach}
              className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              {!coach ? "Loading coaches…" : isPending ? "Saving…" : editing ? "Save changes" : warn || full ? "Book anyway" : "Book session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
