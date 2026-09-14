import type { CoachAvailability, DayOfWeek } from "@/types";
import { clock, dowIndex, DOW_LABELS } from "./time";

const CLOSED_LABELS = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/** Why a coach is unavailable at this date/time, or null if they're working. */
export function offReason(
  avail: CoachAvailability | undefined,
  date: Date,
  start: number,
  duration: number,
): string | null {
  if (!avail) return null;
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const to = avail.timeOff.find((t) => iso >= t.from && iso <= (t.to || t.from));
  if (to) return to.reason + (to.type === "Partial day" ? " · partial day" : "");
  const day: DayOfWeek = DOW_LABELS[dowIndex(date)];
  const h = avail.hours[day];
  if (!h || !h.on || h.shifts.length === 0) return `Not working ${CLOSED_LABELS[dowIndex(date)]}`;

  const fitsAShift = h.shifts.some((s) => start >= s.start && start + duration <= s.end);
  if (fitsAShift) return null;

  const first = h.shifts[0];
  const last = h.shifts[h.shifts.length - 1];
  if (start < first.start) return `Before ${clock(first.start)} start`;
  if (start + duration > last.end) return `Past ${clock(last.end)} finish`;
  return "Outside working hours";
}
