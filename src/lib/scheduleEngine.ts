import { RECURRING_SCHEDULE } from "@/data/mock/schedule";
import type { OneOffBooking, RecurringSeries, MoveRecord } from "@/stores/bookings";
import { dowIndex, isoOf, DOW_LABELS } from "./time";
import type { CoachId, SessionTypeName } from "@/types";

export interface Occurrence {
  /** Stable per-(source, date) key — used for attendance, fees, and moves. */
  key: string;
  iso: string;
  start: number;
  duration: number;
  name: string;
  type: SessionTypeName;
  coach: CoachId;
  roster?: string[];
  sourceId: string;
  moved?: boolean;
}

function originKey(sourceId: string, iso: string): string {
  return `${sourceId}@${iso}`;
}

/** All bookable occurrences (recurring template + one-off bookings + recurring series + moves) for one date. */
export function occurrencesForDate(
  date: Date,
  moves: Record<string, MoveRecord>,
  bookings: OneOffBooking[],
  series: RecurringSeries[],
  cancellations: Record<string, true> = {},
): Occurrence[] {
  const iso = isoOf(date);
  const dow = dowIndex(date);
  const label = DOW_LABELS[dow];

  const fromRecurring: Occurrence[] = RECURRING_SCHEDULE.filter((r) => r.dow === dow).map((r) => ({
    key: originKey(r.id, iso),
    iso,
    start: r.start,
    duration: r.duration,
    name: r.name,
    type: r.type,
    coach: r.coach,
    roster: r.roster,
    sourceId: r.id,
  }));

  const fromBookings: Occurrence[] = bookings
    .filter((b) => b.iso === iso)
    .map((b) => ({
      key: originKey(b.id, iso),
      iso,
      start: b.start,
      duration: b.duration,
      name: b.name,
      type: b.type,
      coach: b.coach,
      roster: b.roster,
      sourceId: b.id,
    }));

  const fromSeries: Occurrence[] = series
    .filter((s) => iso >= s.fromIso && (!s.toIso || iso <= s.toIso) && s.days[label] != null)
    .map((s) => ({
      key: originKey(s.id, iso),
      iso,
      start: s.days[label]!,
      duration: s.duration,
      name: s.client,
      type: s.type,
      coach: s.coach,
      sourceId: s.id,
    }));

  const local = [...fromRecurring, ...fromBookings, ...fromSeries].filter((o) => !moves[o.key] && !cancellations[o.key]);

  const movedIn: Occurrence[] = [];
  for (const [k, m] of Object.entries(moves)) {
    if (m.iso !== iso) continue;
    const sourceId = k.slice(0, k.lastIndexOf("@"));
    const rec = RECURRING_SCHEDULE.find((r) => r.id === sourceId);
    const bk = bookings.find((b) => b.id === sourceId);
    const sr = series.find((s) => s.id === sourceId);
    const duration = rec?.duration ?? bk?.duration ?? sr?.duration;
    const name = rec?.name ?? bk?.name ?? sr?.client;
    const type = rec?.type ?? bk?.type ?? sr?.type;
    const coach = m.coach ?? rec?.coach ?? bk?.coach ?? sr?.coach;
    const roster = rec?.roster ?? bk?.roster;
    if (duration == null || name == null || type == null || coach == null) continue;
    const key = originKey(sourceId, iso);
    if (cancellations[key]) continue;
    const occurrence: Occurrence = { key, iso, start: m.start, duration, name, type, coach, roster, sourceId, moved: true };
    movedIn.push(occurrence);
  }

  return [...local, ...movedIn].sort((a, b) => a.start - b.start);
}
