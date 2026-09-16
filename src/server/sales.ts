"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { getBusinessSettings } from "./settings";
import { parseTaxRate } from "@/lib/tax";
import { rangeStart, type ReportRangeKey } from "@/lib/reportRange";

export type { ReportRangeKey };

export interface SaleLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface NewSaleInput {
  memberId?: string;
  coachId?: string;
  summary: string;
  /** Final amount actually charged, tax included — the single source of truth for what the customer paid. */
  total: number;
  method: string;
  /** false = invoice the member now, pay later (adds to their balance due). */
  paid: boolean;
  /** What this bills for (e.g. "PT sessions Sep 1-15") — shown on the invoice. */
  notes?: string;
  lineItems?: SaleLineItem[];
  /** Tax rate to snapshot on this sale (e.g. 0.05). Defaults to the current Settings tax rate when omitted. */
  taxRate?: number;
}

export async function createSale(input: NewSaleInput): Promise<string> {
  const taxRate = input.taxRate ?? parseTaxRate((await getBusinessSettings()).salesTax);
  const row = await db.sale.create({
    data: {
      memberId: input.memberId || undefined,
      coachId: input.coachId || undefined,
      summary: input.summary,
      total: input.total,
      method: input.method,
      paid: input.paid,
      notes: input.notes?.trim() || undefined,
      lineItems: input.lineItems ? (input.lineItems as object) : undefined,
      taxRate,
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
  notes: string | null;
  createdAt: string;
}

export async function getUnpaidSalesForMember(memberId: string): Promise<UnpaidSale[]> {
  const rows = await db.sale.findMany({ where: { memberId, paid: false }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ id: r.id, summary: r.summary, total: Number(r.total), notes: r.notes, createdAt: r.createdAt.toISOString() }));
}

export interface MemberSaleHistoryRow {
  id: string;
  summary: string;
  total: number;
  method: string;
  paid: boolean;
  createdAt: string;
}

/** Every sale ever recorded for a member, newest first — the full purchase history, paid and unpaid alike. */
export async function getSalesForMember(memberId: string): Promise<MemberSaleHistoryRow[]> {
  const rows = await db.sale.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, summary: r.summary, total: Number(r.total), method: r.method, paid: r.paid, createdAt: r.createdAt.toISOString() }));
}

export async function markSalePaid(saleId: string, memberId: string): Promise<void> {
  await db.sale.update({ where: { id: saleId }, data: { paid: true } });
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/reports");
  revalidatePath(`/invoices/${saleId}`);
}

export interface InvoiceData {
  id: string;
  summary: string;
  total: number;
  method: string;
  paid: boolean;
  notes: string | null;
  lineItems: SaleLineItem[] | null;
  taxRate: number | null;
  createdAt: string;
  member: { id: string; name: string; email: string; phone: string; address: string | null; city: string | null; province: string | null; postalCode: string | null } | null;
  coach: { name: string } | null;
}

export async function getInvoice(saleId: string): Promise<InvoiceData | null> {
  const row = await db.sale.findUnique({
    where: { id: saleId },
    include: { member: true, coach: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    summary: row.summary,
    total: Number(row.total),
    method: row.method,
    paid: row.paid,
    notes: row.notes,
    lineItems: (row.lineItems as SaleLineItem[] | null) ?? null,
    taxRate: row.taxRate != null ? Number(row.taxRate) : null,
    createdAt: row.createdAt.toISOString(),
    member: row.member
      ? {
          id: row.member.id,
          name: `${row.member.firstName} ${row.member.lastName}`.trim(),
          email: row.member.email,
          phone: row.member.phone,
          address: row.member.address,
          city: row.member.city,
          province: row.member.province,
          postalCode: row.member.postalCode,
        }
      : null,
    coach: row.coach ? { name: row.coach.name } : null,
  };
}

export async function updateInvoiceNotes(saleId: string, notes: string): Promise<void> {
  await db.sale.update({ where: { id: saleId }, data: { notes: notes.trim() || null } });
  revalidatePath(`/invoices/${saleId}`);
}


export type DashboardRangeKey = "Day" | "Week" | "Month";

function dashboardRangeStart(range: DashboardRangeKey, now: Date): Date {
  const d = new Date(now);
  if (range === "Week") {
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - dow);
  } else if (range === "Month") {
    d.setDate(1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Real revenue for the dashboard's Day/Week/Month toggle — a coach's own sales when coachId is given. */
export async function getRevenueForRange(range: DashboardRangeKey, coachId?: string): Promise<{ revenue: number; saleCount: number }> {
  const since = dashboardRangeStart(range, new Date());
  const sales = await db.sale.findMany({ where: { createdAt: { gte: since }, paid: true, ...(coachId ? { coachId } : {}) } });
  return { revenue: sales.reduce((a, s) => a + Number(s.total), 0), saleCount: sales.length };
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

export interface SaleExportRow {
  date: string;
  member: string;
  coach: string;
  summary: string;
  method: string;
  paid: boolean;
  total: number;
}

/** Every sale in range for the CSV export — scoped to the signed-in coach's own sales unless they're
    an admin, resolved from the session itself rather than trusted from the caller. */
export async function getSalesRowsForRange(range: ReportRangeKey): Promise<SaleExportRow[]> {
  const requester = await getCurrentCoach();
  const coachId = requester?.isAdmin ? undefined : requester?.id;
  const since = rangeStart(range, new Date());
  const rows = await db.sale.findMany({
    where: { createdAt: { gte: since }, ...(coachId ? { coachId } : {}) },
    include: { member: true, coach: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    date: r.createdAt.toISOString(),
    member: r.member ? `${r.member.firstName} ${r.member.lastName}`.trim() : "Walk-in",
    coach: r.coach?.name ?? "—",
    summary: r.summary,
    method: r.method,
    paid: r.paid,
    total: Number(r.total),
  }));
}
