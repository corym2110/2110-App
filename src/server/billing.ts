"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { getOccurrencesForRange } from "./schedule";
import { getBusinessSettings } from "./settings";
import { parseTaxRate } from "@/lib/tax";
import { sessionTypeByName } from "@/data/mock/sessionTypes";
import { PREBILL_TYPES, type PreBillType } from "@/lib/prebill";

export type { PreBillType };

function fullName(m: { firstName: string; lastName: string }): string {
  return `${m.firstName} ${m.lastName}`.trim();
}

function isoFromOccurrenceKey(key: string): string {
  return key.slice(key.indexOf("@") + 1);
}

export interface BillableItem {
  sessionType: PreBillType;
  occurrenceKeys: string[];
  unitPrice: number;
}

export interface BillableMemberRow {
  memberId: string;
  name: string;
  coachId: string | null;
  coachName: string;
  items: BillableItem[];
  subtotal: number;
}

/** Tallies every not-yet-covered Personal Training / Group Training session in [periodFrom,
    periodTo] across all members, grouped per member. "Not-yet-covered" excludes any occurrence
    a SessionCredit already points to, so re-running this for the same period never double-counts
    a session that was already billed (even across separate runs, or after a reschedule). */
export async function getBillableTally(periodFrom: string, periodTo: string): Promise<BillableMemberRow[]> {
  const [byIso, members, existingCredits] = await Promise.all([
    getOccurrencesForRange(periodFrom, periodTo),
    db.member.findMany({ include: { coach: true } }),
    db.sessionCredit.findMany({ where: { appliedIso: { gte: periodFrom, lte: periodTo } }, select: { appliedOccurrenceKey: true } }),
  ]);

  const covered = new Set(existingCredits.map((c) => c.appliedOccurrenceKey).filter((k): k is string => !!k));
  const byName = new Map(members.map((m) => [fullName(m), m]));

  const byMember = new Map<string, BillableMemberRow>();

  function addUnit(name: string, type: PreBillType, key: string) {
    const member = byName.get(name);
    if (!member) return;
    let row = byMember.get(member.id);
    if (!row) {
      row = { memberId: member.id, name, coachId: member.coachId, coachName: member.coach?.name ?? "Unassigned", items: [], subtotal: 0 };
      byMember.set(member.id, row);
    }
    let item = row.items.find((i) => i.sessionType === type);
    if (!item) {
      item = { sessionType: type, occurrenceKeys: [], unitPrice: sessionTypeByName(type).price };
      row.items.push(item);
    }
    item.occurrenceKeys.push(key);
  }

  for (const occs of Object.values(byIso)) {
    for (const occ of occs) {
      if (!PREBILL_TYPES.includes(occ.type as PreBillType)) continue;
      if (covered.has(occ.key)) continue;
      const type = occ.type as PreBillType;
      if (occ.roster && occ.roster.length > 0) {
        for (const name of occ.roster) addUnit(name, type, occ.key);
      } else {
        addUnit(occ.name, type, occ.key);
      }
    }
  }

  for (const row of byMember.values()) {
    row.subtotal = row.items.reduce((a, i) => a + i.occurrenceKeys.length * i.unitPrice, 0);
  }

  return [...byMember.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface BillEntryInput {
  memberId: string;
  coachId?: string;
  method: string;
  paid: boolean;
  items: { sessionType: PreBillType; unitPrice: number; occurrenceKeys: string[] }[];
}

/** Creates one pre-bill Sale per entry and a SessionCredit for every individual session unit,
    auto-applied to the occurrence it was tallied against — this link is what lets the app always
    know which sessions are already paid for. Admin-only: this moves real money in bulk. */
export async function billPeriod(periodFrom: string, periodTo: string, entries: BillEntryInput[]): Promise<{ saleIds: string[] }> {
  const requester = await getCurrentCoach();
  if (!requester?.isAdmin) throw new Error("Only an admin can run a billing period.");

  const taxRate = parseTaxRate((await getBusinessSettings()).salesTax);
  const saleIds: string[] = [];

  for (const entry of entries) {
    const lineItems = entry.items.map((i) => ({
      description: `${i.sessionType} sessions, ${periodFrom} to ${periodTo}`,
      quantity: i.occurrenceKeys.length,
      unitPrice: i.unitPrice,
    }));
    const subtotal = lineItems.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
    const total = subtotal * (1 + taxRate);
    const summary = entry.items.map((i) => `${i.occurrenceKeys.length} ${i.sessionType}`).join(", ");

    const saleId = await db.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          memberId: entry.memberId,
          coachId: entry.coachId || undefined,
          summary,
          total,
          method: entry.method,
          paid: entry.paid,
          taxRate,
          lineItems,
          periodFrom,
          periodTo,
        },
      });
      for (const item of entry.items) {
        for (const key of item.occurrenceKeys) {
          await tx.sessionCredit.create({
            data: {
              saleId: sale.id,
              memberId: entry.memberId,
              sessionType: item.sessionType,
              unitPrice: item.unitPrice,
              appliedOccurrenceKey: key,
              appliedIso: isoFromOccurrenceKey(key),
            },
          });
        }
      }
      return sale.id;
    });
    saleIds.push(saleId);
  }

  revalidatePath("/members");
  revalidatePath("/reports");
  revalidatePath("/billing");
  return { saleIds };
}

export interface SessionCreditRow {
  id: string;
  saleId: string;
  sessionType: string;
  unitPrice: number;
  appliedOccurrenceKey: string | null;
  appliedIso: string | null;
  createdAt: string;
}

/** Every session credit on file for a member, newest first — the reconciliation view: which
    sessions are paid for, which credits are sitting unapplied and available to assign. */
export async function getSessionCreditsForMember(memberId: string): Promise<SessionCreditRow[]> {
  const rows = await db.sessionCredit.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    saleId: r.saleId,
    sessionType: r.sessionType,
    unitPrice: Number(r.unitPrice),
    appliedOccurrenceKey: r.appliedOccurrenceKey,
    appliedIso: r.appliedIso,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function unapplyCredit(creditId: string): Promise<void> {
  const credit = await db.sessionCredit.update({ where: { id: creditId }, data: { appliedOccurrenceKey: null, appliedIso: null } });
  revalidatePath(`/members/${credit.memberId}`);
}

/** Re-points an unapplied (or previously applied) credit at a different occurrence — the manual
    override on top of the auto-assignment done at billing time. Refuses to double-cover a session
    that another credit already claims. */
export async function applyCreditToOccurrence(creditId: string, occurrenceKey: string): Promise<void> {
  const clash = await db.sessionCredit.findFirst({ where: { appliedOccurrenceKey: occurrenceKey, id: { not: creditId } } });
  if (clash) throw new Error("That session is already covered by a different credit.");

  const credit = await db.sessionCredit.update({
    where: { id: creditId },
    data: { appliedOccurrenceKey: occurrenceKey, appliedIso: isoFromOccurrenceKey(occurrenceKey) },
  });
  revalidatePath(`/members/${credit.memberId}`);
}
