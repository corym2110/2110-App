"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";

export interface NewSaleInput {
  memberId?: string;
  coachId?: string;
  summary: string;
  total: number;
  method: string;
  /** false = invoice the member now, pay later (adds to their balance due). */
  paid: boolean;
}

export async function createSale(input: NewSaleInput): Promise<string> {
  const row = await db.sale.create({
    data: {
      memberId: input.memberId || undefined,
      coachId: input.coachId || undefined,
      summary: input.summary,
      total: input.total,
      method: input.method,
      paid: input.paid,
    },
  });
  if (input.memberId) revalidatePath(`/members/${input.memberId}`);
  revalidatePath("/members");
  revalidatePath("/reports");
  return row.id;
}

export interface UnpaidSale {
  id: string;
  summary: string;
  total: number;
  createdAt: string;
}

export async function getUnpaidSalesForMember(memberId: string): Promise<UnpaidSale[]> {
  const rows = await db.sale.findMany({ where: { memberId, paid: false }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ id: r.id, summary: r.summary, total: Number(r.total), createdAt: r.createdAt.toISOString() }));
}

export async function markSalePaid(saleId: string, memberId: string): Promise<void> {
  await db.sale.update({ where: { id: saleId }, data: { paid: true } });
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/reports");
}

export type ReportRangeKey = "This week" | "This month" | "Last 90 days" | "Year to date";

function rangeStart(range: ReportRangeKey, now: Date): Date {
  const d = new Date(now);
  if (range === "This week") {
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - dow);
  } else if (range === "This month") {
    d.setDate(1);
  } else if (range === "Last 90 days") {
    d.setDate(d.getDate() - 90);
  } else {
    d.setMonth(0, 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface RealReportsSummary {
  revenue: number;
  saleCount: number;
  newMembers: number;
  topSellers: { summary: string; count: number; total: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
  coachShare: { coachId: string; name: string; total: number }[];
  outstandingBalance: number;
}

export async function getRealReportsSummary(range: ReportRangeKey, coachId?: string): Promise<RealReportsSummary> {
  const now = new Date();
  const since = rangeStart(range, now);

  const [sales, newMembers, unpaid] = await Promise.all([
    db.sale.findMany({ where: { createdAt: { gte: since }, ...(coachId ? { coachId } : {}) }, include: { coach: true } }),
    db.member.count({ where: { createdAt: { gte: since }, ...(coachId ? { coachId } : {}) } }),
    db.sale.findMany({ where: { paid: false, ...(coachId ? { coachId } : {}) } }),
  ]);

  const paid = sales.filter((s) => s.paid);
  const revenue = paid.reduce((a, s) => a + Number(s.total), 0);

  const bySummary = new Map<string, { count: number; total: number }>();
  for (const s of paid) {
    const cur = bySummary.get(s.summary) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(s.total);
    bySummary.set(s.summary, cur);
  }
  const topSellers = [...bySummary.entries()]
    .map(([summary, v]) => ({ summary, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const byMethod = new Map<string, { count: number; total: number }>();
  for (const s of paid) {
    const cur = byMethod.get(s.method) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(s.total);
    byMethod.set(s.method, cur);
  }
  const paymentMethods = [...byMethod.entries()].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total);

  const byCoach = new Map<string, { name: string; total: number }>();
  for (const s of paid) {
    if (!s.coachId || !s.coach) continue;
    const cur = byCoach.get(s.coachId) ?? { name: s.coach.name, total: 0 };
    cur.total += Number(s.total);
    byCoach.set(s.coachId, cur);
  }
  const coachShare = [...byCoach.entries()].map(([coachId, v]) => ({ coachId, ...v })).sort((a, b) => b.total - a.total);

  const outstandingBalance = unpaid.reduce((a, s) => a + Number(s.total), 0);

  return { revenue, saleCount: paid.length, newMembers, topSellers, paymentMethods, coachShare, outstandingBalance };
}
