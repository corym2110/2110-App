"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { addDays, dowIndex, DOW_LABELS, isoOf } from "@/lib/time";
import type { CoachId, DayOfWeek, SessionTypeName, TimeOffEntry } from "@/types";

export interface Occurrence {
  /** Stable per-(source, date) key — used for attendance, waitlists, cancel/move. */
  key: string;
  iso: string;
  start: number;
  duration: number;
  name: string;
  type: SessionTypeName;
  coach: CoachId;
  roster?: string[];
  sourceId: string;
}

function originKey(sourceId: string, iso: string): string {
  return `${sourceId}@${iso}`;
}

function afterSchedule() {
  revalidatePath("/schedule");
  revalidatePath("/classes");
  revalidatePath("/dashboard");
  revalidatePath("/members");
}

/** All bookable occurrences for every date in [fromIso, toIso], keyed by iso. */
export async function getOccurrencesForRange(fromIso: string, toIso: string, coachId?: string): Promise<Record<string, Occurrence[]>> {
  const [bookings, seriesList] = await Promise.all([
    db.booking.findMany({ where: { iso: { gte: fromIso, lte: toIso }, ...(coachId ? { coachId } : {}) } }),
    db.recurringSeries.findMany({
      where: {
        fromIso: { lte: toIso },
        AND: [{ OR: [{ toIso: null }, { toIso: { gte: fromIso } }] }],
        ...(coachId ? { coachId } : {}),
      },
    }),
  ]);

  const byIso: Record<string, Occurrence[]> = {};
  let cursor = new Date(`${fromIso}T00:00:00`);
  const end = new Date(`${toIso}T00:00:00`);
  while (cursor <= end) {
    const iso = isoOf(cursor);
    const label = DOW_LABELS[dowIndex(cursor)];

    const fromBookings: Occurrence[] = bookings
      .filter((b) => b.iso === iso)
      .map((b) => ({
        key: originKey(b.id, iso),
        iso,
        start: b.start,
        duration: b.duration,
        name: b.name,
        type: b.type as SessionTypeName,
        coach: b.coachId,
        roster: b.roster.length > 0 ? b.roster : undefined,
        sourceId: b.id,
      }));

    const fromSeries: Occurrence[] = seriesList
      .filter((s) => {
        const days = s.days as Partial<Record<DayOfWeek, number>>;
        return iso >= s.fromIso && (!s.toIso || iso <= s.toIso) && !s.excludedDates.includes(iso) && days[label] != null;
      })
      .map((s) => {
        const days = s.days as Partial<Record<DayOfWeek, number>>;
        return {
          key: originKey(s.id, iso),
          iso,
          start: days[label]!,
          duration: s.duration,
          name: s.clientName,
          type: s.type as SessionTypeName,
          coach: s.coachId,
          sourceId: s.id,
        };
      });

    byIso[iso] = [...fromBookings, ...fromSeries].sort((a, b) => a.start - b.start);
    cursor = addDays(cursor, 1);
  }
  return byIso;
}

export async function getOccurrencesForDate(iso: string, coachId?: string): Promise<Occurrence[]> {
  const byIso = await getOccurrencesForRange(iso, iso, coachId);
  return byIso[iso] ?? [];
}

/** Most recent past-or-today occurrence (date + start time) for each name, from real bookings and
    recurring series alike — used to show a member's real "last session" instead of a fixed string. */
export async function getLastSessionByName(names: string[]): Promise<Record<string, { iso: string; start: number }>> {
  if (names.length === 0) return {};
  const todayIso = isoOf(new Date());

  const [bookings, seriesList] = await Promise.all([
    db.booking.findMany({
      where: { name: { in: names }, iso: { lte: todayIso } },
      orderBy: [{ iso: "desc" }, { start: "desc" }],
      select: { name: true, iso: true, start: true },
    }),
    db.recurringSeries.findMany({ where: { clientName: { in: names }, fromIso: { lte: todayIso } } }),
  ]);

  const result: Record<string, { iso: string; start: number }> = {};
  for (const b of bookings) {
    if (!result[b.name]) result[b.name] = { iso: b.iso, start: b.start };
  }

  for (const s of seriesList) {
    const days = s.days as Partial<Record<DayOfWeek, number>>;
    const endIso = s.toIso && s.toIso < todayIso ? s.toIso : todayIso;
    let cursor = new Date(`${endIso}T00:00:00`);
    const floor = new Date(`${s.fromIso}T00:00:00`);
    let found: { iso: string; start: number } | null = null;
    for (let i = 0; i < 400 && cursor >= floor && !found; i++) {
      const iso = isoOf(cursor);
      const label = DOW_LABELS[dowIndex(cursor)];
      const start = days[label];
      if (start != null && !s.excludedDates.includes(iso)) found = { iso, start };
      cursor = addDays(cursor, -1);
    }
    if (found) {
      const existing = result[s.clientName];
      if (!existing || found.iso > existing.iso || (found.iso === existing.iso && found.start > existing.start)) {
        result[s.clientName] = found;
      }
    }
  }

  return result;
}

export interface NewBookingInput {
  iso: string;
  start: number;
  duration: number;
  type: SessionTypeName;
  coachId: string;
  name: string;
  roster?: string[];
}

export async function addBooking(input: NewBookingInput): Promise<string> {
  const row = await db.booking.create({
    data: {
      iso: input.iso,
      start: input.start,
      duration: input.duration,
      type: input.type,
      coachId: input.coachId,
      name: input.name,
      roster: input.roster ?? [],
    },
  });
  afterSchedule();
  return row.id;
}

export async function updateBooking(id: string, patch: Partial<NewBookingInput>): Promise<void> {
  await db.booking.update({ where: { id }, data: patch });
  afterSchedule();
}

export interface NewSeriesInput {
  clientName: string;
  type: SessionTypeName;
  coachId: string;
  duration: number;
  days: Partial<Record<DayOfWeek, number>>;
  fromIso: string;
  toIso?: string;
}

export async function addSeries(input: NewSeriesInput): Promise<string> {
  const row = await db.recurringSeries.create({
    data: {
      clientName: input.clientName,
      type: input.type,
      coachId: input.coachId,
      duration: input.duration,
      days: input.days,
      fromIso: input.fromIso,
      toIso: input.toIso,
    },
  });
  afterSchedule();
  return row.id;
}

/** Cancels one occurrence: deletes it outright if it's a one-off booking, otherwise excludes
    just that single date from its recurring series (the rest of the series is untouched). */
export async function cancelOccurrence(sourceId: string, key: string): Promise<void> {
  const iso = key.slice(key.lastIndexOf("@") + 1);
  const booking = await db.booking.findUnique({ where: { id: sourceId } });
  if (booking) {
    await db.booking.delete({ where: { id: sourceId } });
  } else {
    const series = await db.recurringSeries.findUnique({ where: { id: sourceId } });
    if (series && !series.excludedDates.includes(iso)) {
      await db.recurringSeries.update({ where: { id: sourceId }, data: { excludedDates: [...series.excludedDates, iso] } });
    }
  }
  afterSchedule();
}

/** Moves/edits one occurrence to a new date/time/coach. A one-off booking is updated in place;
    a recurring occurrence is excluded on its origin date and recreated as a one-off booking. */
export async function moveOccurrence(
  occ: { sourceId: string; key: string; type: SessionTypeName; duration: number; name: string; roster?: string[] },
  targetIso: string,
  targetStart: number,
  targetCoachId?: string,
): Promise<void> {
  const booking = await db.booking.findUnique({ where: { id: occ.sourceId } });
  if (booking) {
    await db.booking.update({
      where: { id: occ.sourceId },
      data: { iso: targetIso, start: targetStart, ...(targetCoachId ? { coachId: targetCoachId } : {}) },
    });
  } else {
    const series = await db.recurringSeries.findUnique({ where: { id: occ.sourceId } });
    const originIso = occ.key.slice(occ.key.lastIndexOf("@") + 1);
    if (series && !series.excludedDates.includes(originIso)) {
      await db.recurringSeries.update({ where: { id: occ.sourceId }, data: { excludedDates: [...series.excludedDates, originIso] } });
    }
    await db.booking.create({
      data: {
        iso: targetIso,
        start: targetStart,
        duration: occ.duration,
        type: occ.type,
        coachId: targetCoachId ?? series?.coachId ?? "",
        name: occ.name,
        roster: occ.roster ?? [],
      },
    });
  }
  afterSchedule();
}

// --- Attendance ---

export async function getAttendanceForRange(fromIso: string, toIso: string): Promise<Record<string, string>> {
  const rows = await db.attendanceRecord.findMany({ where: { iso: { gte: fromIso, lte: toIso } } });
  return Object.fromEntries(rows.map((r) => [r.slotKey, r.status]));
}

export async function setAttendanceStatus(slotKey: string, iso: string, status: string | null): Promise<void> {
  if (status == null) {
    await db.attendanceRecord.deleteMany({ where: { slotKey } });
  } else {
    await db.attendanceRecord.upsert({
      where: { slotKey },
      create: { slotKey, iso, status },
      update: { status },
    });
  }
  afterSchedule();
}

// --- Waitlist / class add-ins ---

export async function getWaitlistDataForRange(
  fromIso: string,
  toIso: string,
): Promise<{ waitlists: Record<string, string[]>; classAdds: Record<string, string[]> }> {
  const [waitRows, addRows] = await Promise.all([
    db.waitlistEntry.findMany({ where: { iso: { gte: fromIso, lte: toIso } }, orderBy: { createdAt: "asc" } }),
    db.classAddIn.findMany({ where: { iso: { gte: fromIso, lte: toIso } }, orderBy: { createdAt: "asc" } }),
  ]);
  const waitlists: Record<string, string[]> = {};
  for (const r of waitRows) (waitlists[r.occurrenceKey] ??= []).push(r.memberName);
  const classAdds: Record<string, string[]> = {};
  for (const r of addRows) (classAdds[r.occurrenceKey] ??= []).push(r.memberName);
  return { waitlists, classAdds };
}

export async function addToWaitlist(occurrenceKey: string, memberName: string): Promise<void> {
  const iso = occurrenceKey.slice(occurrenceKey.lastIndexOf("@") + 1);
  await db.waitlistEntry.upsert({
    where: { occurrenceKey_memberName: { occurrenceKey, memberName } },
    create: { occurrenceKey, iso, memberName },
    update: {},
  });
  afterSchedule();
}

export async function removeFromWaitlist(occurrenceKey: string, memberName: string): Promise<void> {
  await db.waitlistEntry.deleteMany({ where: { occurrenceKey, memberName } });
  afterSchedule();
}

export async function addToClass(occurrenceKey: string, memberName: string): Promise<void> {
  const iso = occurrenceKey.slice(occurrenceKey.lastIndexOf("@") + 1);
  await db.classAddIn.upsert({
    where: { occurrenceKey_memberName: { occurrenceKey, memberName } },
    create: { occurrenceKey, iso, memberName },
    update: {},
  });
  afterSchedule();
}

export async function promoteFromWaitlist(occurrenceKey: string, memberName: string): Promise<void> {
  await removeFromWaitlist(occurrenceKey, memberName);
  await addToClass(occurrenceKey, memberName);
}

// --- Coach availability ---

export interface Shift {
  start: number;
  end: number;
}
export interface DayHoursDTO {
  on: boolean;
  shifts: Shift[];
}
export type WeeklyHours = Record<DayOfWeek, DayHoursDTO>;

const EMPTY_WEEKLY_HOURS: WeeklyHours = {
  Mon: { on: false, shifts: [] },
  Tue: { on: false, shifts: [] },
  Wed: { on: false, shifts: [] },
  Thu: { on: false, shifts: [] },
  Fri: { on: false, shifts: [] },
  Sat: { on: false, shifts: [] },
  Sun: { on: false, shifts: [] },
};

export interface CoachAvailabilityDTO {
  hours: WeeklyHours;
  timeOff: (TimeOffEntry & { id: string })[];
}

export async function getAvailabilityForCoaches(coachIds: string[]): Promise<Record<string, CoachAvailabilityDTO>> {
  if (coachIds.length === 0) return {};
  const [coaches, timeOffRows] = await Promise.all([
    db.coach.findMany({ where: { id: { in: coachIds } }, select: { id: true, weeklyHours: true } }),
    db.timeOff.findMany({ where: { coachId: { in: coachIds } } }),
  ]);
  return Object.fromEntries(
    coaches.map((c) => [
      c.id,
      {
        hours: (c.weeklyHours as WeeklyHours | null) ?? EMPTY_WEEKLY_HOURS,
        timeOff: timeOffRows
          .filter((t) => t.coachId === c.id)
          .map((t) => ({ id: t.id, from: t.fromIso, to: t.toIso, reason: t.reason, type: t.type as TimeOffEntry["type"] })),
      },
    ]),
  );
}

export async function getCoachAvailability(coachId: string): Promise<CoachAvailabilityDTO> {
  const [coach, timeOff] = await Promise.all([
    db.coach.findUnique({ where: { id: coachId }, select: { weeklyHours: true } }),
    db.timeOff.findMany({ where: { coachId }, orderBy: { fromIso: "asc" } }),
  ]);
  return {
    hours: (coach?.weeklyHours as WeeklyHours | null) ?? EMPTY_WEEKLY_HOURS,
    timeOff: timeOff.map((t) => ({ id: t.id, from: t.fromIso, to: t.toIso, reason: t.reason, type: t.type as TimeOffEntry["type"] })),
  };
}

export async function setWeeklyHours(coachId: string, hours: WeeklyHours): Promise<void> {
  await db.coach.update({ where: { id: coachId }, data: { weeklyHours: hours as object } });
  revalidatePath("/preferences");
  revalidatePath("/schedule");
}

export async function addTimeOff(coachId: string, entry: TimeOffEntry): Promise<void> {
  await db.timeOff.create({ data: { coachId, fromIso: entry.from, toIso: entry.to, reason: entry.reason, type: entry.type } });
  revalidatePath("/preferences");
  revalidatePath("/schedule");
}

export async function removeTimeOff(timeOffId: string): Promise<void> {
  await db.timeOff.delete({ where: { id: timeOffId } });
  revalidatePath("/preferences");
  revalidatePath("/schedule");
}
