"use server";

import { db } from "./db";
import { getOccurrencesForRange } from "./schedule";
import { rangeStart, type ReportRangeKey } from "@/lib/reportRange";
import { isoOf, MONTHS } from "@/lib/time";

// --- Clients by registration date ---

export interface RegistrationCohort {
  month: string;
  label: string;
  count: number;
}

export async function getRegistrationCohorts(range: ReportRangeKey, coachId?: string): Promise<RegistrationCohort[]> {
  const since = rangeStart(range, new Date());
  const members = await db.member.findMany({
    where: { createdAt: { gte: since }, ...(coachId ? { coachId } : {}) },
    select: { createdAt: true },
  });

  const byMonth = new Map<string, number>();
  for (const m of members) {
    const key = `${m.createdAt.getFullYear()}-${String(m.createdAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const [y, mo] = month.split("-");
      return { month, label: `${MONTHS[Number(mo) - 1].slice(0, 3)} ${y}`, count };
    });
}

// --- Sales summary by client ---

export interface ClientSalesRow {
  memberId: string;
  name: string;
  total: number;
  count: number;
}

export async function getSalesSummaryByClient(range: ReportRangeKey, coachId?: string): Promise<ClientSalesRow[]> {
  const since = rangeStart(range, new Date());
  const sales = await db.sale.findMany({
    where: { createdAt: { gte: since }, paid: true, memberId: { not: null }, ...(coachId ? { coachId } : {}) },
    include: { member: true },
  });

  const byMember = new Map<string, ClientSalesRow>();
  for (const s of sales) {
    if (!s.member || !s.memberId) continue;
    const cur = byMember.get(s.memberId) ?? { memberId: s.memberId, name: `${s.member.firstName} ${s.member.lastName}`.trim(), total: 0, count: 0 };
    cur.total += Number(s.total);
    cur.count += 1;
    byMember.set(s.memberId, cur);
  }

  return [...byMember.values()].sort((a, b) => b.total - a.total).slice(0, 15);
}

// --- First visits ---

export interface FirstVisitRow {
  memberId: string;
  name: string;
  iso: string;
}

/** Members whose earliest-ever booked session (one-off or recurring) falls within the selected
    range — mirrors the same name-matching approach getLastSessionByName already uses for "last
    session," just walking forward instead of back. */
export async function getFirstVisits(range: ReportRangeKey, coachName?: string): Promise<FirstVisitRow[]> {
  const since = rangeStart(range, new Date());
  const sinceIso = isoOf(since);
  const todayIso = isoOf(new Date());

  const members = await db.member.findMany({ where: coachName ? { coach: { name: coachName } } : undefined });
  if (members.length === 0) return [];
  const names = members.map((m) => `${m.firstName} ${m.lastName}`.trim());

  const [bookings, seriesList] = await Promise.all([
    db.booking.findMany({ where: { name: { in: names } }, select: { name: true, iso: true } }),
    db.recurringSeries.findMany({ where: { clientName: { in: names } }, select: { clientName: true, fromIso: true } }),
  ]);

  const firstByName: Record<string, string> = {};
  for (const b of bookings) {
    if (!firstByName[b.name] || b.iso < firstByName[b.name]) firstByName[b.name] = b.iso;
  }
  for (const s of seriesList) {
    if (!firstByName[s.clientName] || s.fromIso < firstByName[s.clientName]) firstByName[s.clientName] = s.fromIso;
  }

  const rows: FirstVisitRow[] = [];
  for (const m of members) {
    const name = `${m.firstName} ${m.lastName}`.trim();
    const iso = firstByName[name];
    if (iso && iso >= sinceIso && iso <= todayIso) rows.push({ memberId: m.id, name, iso });
  }
  return rows.sort((a, b) => a.iso.localeCompare(b.iso));
}

// --- Class utilization (admin only — spans all coaches) ---

export interface ClassUtilizationRow {
  name: string;
  sessions: number;
  avgFillPct: number;
}

export interface ClassUtilizationSummary {
  overallFillPct: number;
  totalSessions: number;
  byClass: ClassUtilizationRow[];
}

export async function getClassUtilization(range: ReportRangeKey): Promise<ClassUtilizationSummary> {
  const since = rangeStart(range, new Date());
  const sinceIso = isoOf(since);
  const todayIso = isoOf(new Date());
  const byIso = await getOccurrencesForRange(sinceIso, todayIso);

  const byClass = new Map<string, { filled: number; capacity: number; sessions: number }>();
  let totalFilled = 0;
  let totalCapacity = 0;
  let totalSessions = 0;

  for (const occs of Object.values(byIso)) {
    for (const occ of occs) {
      if (occ.capacity <= 0) continue; // 1:1 sessions have no meaningful "fill rate"
      const filled = occ.roster?.length ?? 0;
      totalFilled += filled;
      totalCapacity += occ.capacity;
      totalSessions += 1;
      const cur = byClass.get(occ.name) ?? { filled: 0, capacity: 0, sessions: 0 };
      cur.filled += filled;
      cur.capacity += occ.capacity;
      cur.sessions += 1;
      byClass.set(occ.name, cur);
    }
  }

  return {
    overallFillPct: totalCapacity > 0 ? Math.round((totalFilled / totalCapacity) * 100) : 0,
    totalSessions,
    byClass: [...byClass.entries()]
      .map(([name, v]) => ({ name, sessions: v.sessions, avgFillPct: v.capacity > 0 ? Math.round((v.filled / v.capacity) * 100) : 0 }))
      .sort((a, b) => b.avgFillPct - a.avgFillPct),
  };
}

// --- Daily attendance summary (admin only — AttendanceRecord has no per-coach column) ---

export interface DailyAttendanceRow {
  iso: string;
  scheduled: number;
  checkedIn: number;
  noShow: number;
  lateCancel: number;
}

export async function getDailyAttendanceSummary(range: ReportRangeKey): Promise<DailyAttendanceRow[]> {
  const since = rangeStart(range, new Date());
  const sinceIso = isoOf(since);
  const todayIso = isoOf(new Date());

  const [byIso, attendance] = await Promise.all([
    getOccurrencesForRange(sinceIso, todayIso),
    db.attendanceRecord.findMany({ where: { iso: { gte: sinceIso, lte: todayIso } } }),
  ]);

  const statusByIso = new Map<string, { checkedIn: number; noShow: number; lateCancel: number }>();
  for (const a of attendance) {
    const cur = statusByIso.get(a.iso) ?? { checkedIn: 0, noShow: 0, lateCancel: 0 };
    if (a.status === "Checked in") cur.checkedIn += 1;
    else if (a.status === "No-show") cur.noShow += 1;
    else if (a.status === "Late cancel") cur.lateCancel += 1;
    statusByIso.set(a.iso, cur);
  }

  return Object.entries(byIso)
    .map(([iso, occs]) => {
      const scheduled = occs.reduce((a, o) => a + (o.capacity > 0 ? (o.roster?.length ?? 0) : 1), 0);
      const s = statusByIso.get(iso) ?? { checkedIn: 0, noShow: 0, lateCancel: 0 };
      return { iso, scheduled, ...s };
    })
    .filter((d) => d.scheduled > 0 || d.checkedIn > 0 || d.noShow > 0 || d.lateCancel > 0)
    .sort((a, b) => b.iso.localeCompare(a.iso));
}
