"use client";

import { useMemo, useState } from "react";
import { COACHES } from "@/data/mock/coaches";
import { MEMBERS } from "@/data/mock/members";
import { SESSION_TYPES, capacityOf, sessionTypeByName } from "@/data/mock/sessionTypes";
import { useAvailabilityStore } from "@/stores/availability";
import { useBookingsStore } from "@/stores/bookings";
import { occurrencesForDate } from "@/lib/scheduleEngine";
import { offReason } from "@/lib/availability";
import { clock, formatDateLong } from "@/lib/time";
import type { CoachId, SessionTypeName } from "@/types";
import { XIcon } from "@/components/ui/icons";

const TIME_OPTIONS: number[] = (() => {
  const out: number[] = [];
  for (let m = 360; m < 1200; m += 5) out.push(m);
  return out;
})();

export function BookingDialog({ iso, start, onClose }: { iso: string; start: number; onClose: () => void }) {
  const [type, setType] = useState<SessionTypeName>("Personal Training");
  const [coach, setCoach] = useState<CoachId>("CM");
  const [time, setTime] = useState(start);
  const [client, setClient] = useState("");
  const [recur, setRecur] = useState(false);

  const byCoach = useAvailabilityStore((s) => s.byCoach);
  const { bookings, series, moves, addBooking, addSeries } = useBookingsStore();

  const date = useMemo(() => new Date(`${iso}T00:00:00`), [iso]);
  const duration = sessionTypeByName(type).duration;
  const warn = offReason(byCoach[coach], date, time, duration);
  const cap = capacityOf(type);
  const existing = occurrencesForDate(date, moves, bookings, series).filter((o) => o.start === time && o.coach === coach && o.type === type);
  const head = existing.reduce((a, o) => a + (o.roster?.length ?? 1), 0);
  const full = cap > 0 && head >= cap;

  const canRecur = type === "Personal Training" || type === "Group Training";

  function confirm() {
    if (!client.trim() && type !== "Group Training" && type !== "Class") return;
    if (recur && canRecur) {
      const dow = date.getDay();
      const label = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[dow];
      const DOW_MAP = { Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat", Sun: "Sun" } as const;
      addSeries({
        client: client.trim(),
        type,
        coach,
        duration,
        days: { [DOW_MAP[label as keyof typeof DOW_MAP]]: time },
        fromIso: iso,
      });
    } else {
      addBooking({ iso, start: time, duration, type, coach, name: client.trim() });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex w-full max-w-[420px] flex-col gap-3.5 rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">New session</div>
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
          <select value={type} onChange={(e) => setType(e.target.value as SessionTypeName)} className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm">
            {SESSION_TYPES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} · {t.duration} min
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Coach</span>
            <select value={coach} onChange={(e) => setCoach(e.target.value as CoachId)} className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm">
              {COACHES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Start time</span>
            <select value={time} onChange={(e) => setTime(Number(e.target.value))} className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm">
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {clock(t)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Client</span>
          <input
            list="member-list"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder={type === "Group Training" || type === "Class" ? "Optional title" : "Start typing a name…"}
            className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
          />
          <datalist id="member-list">
            {MEMBERS.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </label>

        {canRecur && (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={recur} onChange={(e) => setRecur(e.target.checked)} className="h-4 w-4" />
            Repeat weekly on this day, with no end date
          </label>
        )}

        {warn && (
          <div className="rounded-lg bg-amber-500/15 px-3 py-2.5 text-[12.5px] text-amber-700 dark:text-amber-300">
            {coach} isn&apos;t working then: {warn}. You can still book — it&apos;s the coach&apos;s call.
          </div>
        )}
        {full && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">This slot is already full ({head} of {cap}).</div>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Cancel
          </button>
          <button type="button" onClick={confirm} className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent">
            {warn || full ? "Book anyway" : "Book session"}
          </button>
        </div>
      </div>
    </div>
  );
}
