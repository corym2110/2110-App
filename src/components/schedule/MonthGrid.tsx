"use client";

import { useThemeStore } from "@/stores/theme";
import { useBookingsStore } from "@/stores/bookings";
import { occurrencesForDate } from "@/lib/scheduleEngine";
import { addDays, clock, isoOf, mondayOf } from "@/lib/time";
import { sessionTypeColor } from "@/data/mock/sessionTypes";
import type { CoachId } from "@/types";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({
  monthAnchor,
  today,
  coachFilter,
  onPickDay,
}: {
  monthAnchor: Date;
  today: Date;
  coachFilter: "all" | CoachId;
  onPickDay: (d: Date) => void;
}) {
  const dark = useThemeStore((s) => s.theme === "dark");
  const { bookings, series, moves } = useBookingsStore();

  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = mondayOf(firstOfMonth);
  const cells = Array.from({ length: 35 }, (_, i) => addDays(gridStart, i));
  const todayIso = isoOf(today);

  return (
    <div className="min-w-0">
      <div className="sticky top-16 z-[2] grid grid-cols-7 rounded-t-2xl border-b border-divider bg-surface">
        {DOW.map((w) => (
          <div key={w} className="border-l border-divider px-2.5 py-2 text-[11px] tracking-wider text-muted uppercase first:border-l-0">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const iso = isoOf(date);
          const inMonth = date.getMonth() === monthAnchor.getMonth();
          const occ = occurrencesForDate(date, moves, bookings, series).filter((o) => coachFilter === "all" || o.coach === coachFilter);
          const chips = occ.slice(0, 3);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPickDay(date)}
              className={`flex min-h-[152px] min-w-0 flex-col gap-1 border-b border-l border-divider px-2 py-2 text-left first-of-type:border-l-0 hover:bg-row ${
                inMonth ? "" : "opacity-40"
              }`}
            >
              <span className={`text-[12.5px] tabular-nums ${iso === todayIso ? "font-bold text-accent" : "font-medium"}`}>{date.getDate()}</span>
              {chips.map((c) => (
                <div key={c.key} className="min-w-0 rounded-md py-0.5 pl-1.5 leading-tight" style={{ borderLeft: `3px solid ${sessionTypeColor(c.type, dark)}` }}>
                  <div className="truncate text-[10px] font-semibold" style={{ color: sessionTypeColor(c.type, dark) }}>
                    {c.type}
                  </div>
                  <div className="truncate text-[10.5px]">{c.name || "Group Training"}</div>
                  <div className="truncate text-[9.5px] tabular-nums text-muted">{clock(c.start)}</div>
                </div>
              ))}
              {occ.length > 3 && <span className="text-[10.5px] text-muted">+{occ.length - 3} more</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
