"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { getOccurrencesForRange } from "./schedule";
import { getBusinessSettings } from "./settings";
import { parseTaxRate } from "@/lib/tax";
import { sessionTypeByName } from "@/data/mock/sessionTypes";
import { PREBILL_TYPES, type PreBillType } from "@/lib/prebill";
import { addDays, isoOf } from "@/lib/time";

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
    periodTo] across all members, grouped per member. "Not-yet-covered" excludes any (occurrence,
    member) pair a SessionCredit already points to, so re-running this for the same period never
    double-counts a session that was already billed (even across separate runs, or after a
    reschedule) — scoped per member, not just per occurrence, since one Group Training slot can
    have several attendees each paying with their own credit against the same occurrence key. */
export async function getBillableTally(periodFrom: string, periodTo: string): Promise<BillableMemberRow[]> {
  const [byIso, members, existingCredits] = await Promise.all([
    getOccurrencesForRange(periodFrom, periodTo),
    db.member.findMany({ include: { coach: true } }),
    db.sessionCredit.findMany({ where: { appliedIso: { gte: periodFrom, lte: periodTo } }, select: { appliedOccurrenceKey: true, memberId: true } }),
  ]);

  const covered = new Set(existingCredits.filter((c) => c.appliedOccurrenceKey).map((c) => `${c.appliedOccurrenceKey}::${c.memberId}`));
  const byName = new Map(members.map((m) => [fullName(m), m]));

  const byMember = new Map<string, BillableMemberRow>();

  function addUnit(name: string, type: PreBillType, key: string) {
    const member = byName.get(name);
    if (!member) return;
    if (covered.has(`${key}::${member.id}`)) return;
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

/** Same reconciliation as a period pre-bill, but for a single ad-hoc POS sale of Personal
    Training / Group Training sessions — auto-applies one credit per unit purchased to the
    member's soonest not-yet-covered upcoming session of that type, looking up to 180 days
    ahead. Any units bought beyond what's currently on the calendar are created unapplied
    (available), same as an unused credit from a period bill. */
export async function createSessionCreditsForSale(
  saleId: string,
  memberId: string,
  items: { sessionType: PreBillType; unitPrice: number; quantity: number }[],
): Promise<void> {
  const relevant = items.filter((i) => PREBILL_TYPES.includes(i.sessionType));
  if (relevant.length === 0) return;

  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  const name = fullName(member);
  const todayIso = isoOf(new Date());
  const horizonIso = isoOf(addDays(new Date(), 180));

  const [byIso, existingCredits] = await Promise.all([
    getOccurrencesForRange(todayIso, horizonIso),
    db.sessionCredit.findMany({ where: { memberId, appliedOccurrenceKey: { not: null } }, select: { appliedOccurrenceKey: true } }),
  ]);
  const covered = new Set(existingCredits.map((c) => c.appliedOccurrenceKey));

  const keysByType = new Map<PreBillType, string[]>();
  for (const occs of Object.values(byIso)) {
    for (const occ of occs) {
      const type = occ.type as PreBillType;
      if (!PREBILL_TYPES.includes(type)) continue;
      const involved = occ.roster && occ.roster.length > 0 ? occ.roster.includes(name) : occ.name === name;
      if (!involved || covered.has(occ.key)) continue;
      const list = keysByType.get(type) ?? [];
      list.push(occ.key);
      keysByType.set(type, list);
    }
  }

  await db.$transaction(async (tx) => {
    for (const item of relevant) {
      const available = keysByType.get(item.sessionType) ?? [];
      for (let i = 0; i < item.quantity; i++) {
        const key = available.shift();
        await tx.sessionCredit.create({
          data: {
            saleId,
            memberId,
            sessionType: item.sessionType,
            unitPrice: item.unitPrice,
            appliedOccurrenceKey: key ?? null,
            appliedIso: key ? isoFromOccurrenceKey(key) : null,
          },
        });
      }
    }
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/schedule");
}

export interface SessionCreditRow {
  id: string;
  saleId: string;
  sessionType: string;
  unitPrice: number;
  appliedOccurrenceKey: string | null;
  appliedIso: string | null;
  /** Start time (minutes from midnight) of the occurrence this credit is applied to, resolved
      from the live schedule — two different sessions can land on the same calendar date, so the
      date alone isn't always enough to tell them apart. */
  appliedStart: number | null;
  createdAt: string;
}

async function withStartTimes(rows: Omit<SessionCreditRow, "appliedStart">[]): Promise<SessionCreditRow[]> {
  const isos = rows.map((r) => r.appliedIso).filter((v): v is string => !!v);
  if (isos.length === 0) return rows.map((r) => ({ ...r, appliedStart: null }));
  const minIso = isos.reduce((a, b) => (a < b ? a : b));
  const maxIso = isos.reduce((a, b) => (a > b ? a : b));
  const byIso = await getOccurrencesForRange(minIso, maxIso);
  const startByKey = new Map<string, number>();
  for (const occs of Object.values(byIso)) for (const occ of occs) startByKey.set(occ.key, occ.start);
  return rows.map((r) => ({ ...r, appliedStart: r.appliedOccurrenceKey != null ? startByKey.get(r.appliedOccurrenceKey) ?? null : null }));
}

/** Every session credit this specific sale paid for — the "sessions this pays for" list on the
    receipt, whether that sale came from a period bill or a one-off POS purchase. */
export async function getSessionCreditsForSale(saleId: string): Promise<SessionCreditRow[]> {
  const rows = await db.sessionCredit.findMany({ where: { saleId }, orderBy: { appliedIso: "asc" } });
  return withStartTimes(
    rows.map((r) => ({
      id: r.id,
      saleId: r.saleId,
      sessionType: r.sessionType,
      unitPrice: Number(r.unitPrice),
      appliedOccurrenceKey: r.appliedOccurrenceKey,
      appliedIso: r.appliedIso,
      createdAt: r.createdAt.toISOString(),
    })),
  );
}

/** Every session credit on file for a member, newest first — the reconciliation view: which
    sessions are paid for, which credits are sitting unapplied and available to assign. */
export async function getSessionCreditsForMember(memberId: string): Promise<SessionCreditRow[]> {
  const rows = await db.sessionCredit.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } });
  return withStartTimes(
    rows.map((r) => ({
      id: r.id,
      saleId: r.saleId,
      sessionType: r.sessionType,
      unitPrice: Number(r.unitPrice),
      appliedOccurrenceKey: r.appliedOccurrenceKey,
      appliedIso: r.appliedIso,
      createdAt: r.createdAt.toISOString(),
    })),
  );
}

export async function unapplyCredit(creditId: string): Promise<void> {
  const credit = await db.sessionCredit.update({ where: { id: creditId }, data: { appliedOccurrenceKey: null, appliedIso: null } });
  revalidatePath(`/members/${credit.memberId}`);
}

/** Re-points an unapplied (or previously applied) credit at a different occurrence — the manual
    override on top of the auto-assignment done at billing time. Refuses to double-cover a session
    that another credit *for the same member* already claims — scoped per member because one
    Group Training occurrence legitimately hosts a separate credit per attendee. */
export async function applyCreditToOccurrence(creditId: string, occurrenceKey: string): Promise<void> {
  const credit = await db.sessionCredit.findUniqueOrThrow({ where: { id: creditId } });
  const clash = await db.sessionCredit.findFirst({
    where: { appliedOccurrenceKey: occurrenceKey, memberId: credit.memberId, id: { not: creditId } },
  });
  if (clash) throw new Error("That session is already covered by a different credit.");

  await db.sessionCredit.update({
    where: { id: creditId },
    data: { appliedOccurrenceKey: occurrenceKey, appliedIso: isoFromOccurrenceKey(occurrenceKey) },
  });
  revalidatePath(`/members/${credit.memberId}`);
  revalidatePath("/schedule");
  revalidatePath("/classes");
}

export interface CreditOption {
  id: string;
  unitPrice: number;
  createdAt: string;
}

export interface OccurrenceCreditInfo {
  applied: CreditOption | null;
  availableCredits: CreditOption[];
}

/** What a specific member's specific scheduled occurrence is paid with, plus every unapplied
    credit of the matching type they could switch it to — the data behind the "Paid with" control
    on the Schedule/Classes detail panel. */
export async function getCreditInfoForOccurrence(occurrenceKey: string, memberId: string, sessionType: string): Promise<OccurrenceCreditInfo> {
  const [applied, available] = await Promise.all([
    db.sessionCredit.findFirst({ where: { appliedOccurrenceKey: occurrenceKey, memberId } }),
    db.sessionCredit.findMany({ where: { memberId, sessionType, appliedOccurrenceKey: null }, orderBy: { createdAt: "asc" } }),
  ]);
  return {
    applied: applied ? { id: applied.id, unitPrice: Number(applied.unitPrice), createdAt: applied.createdAt.toISOString() } : null,
    availableCredits: available.map((c) => ({ id: c.id, unitPrice: Number(c.unitPrice), createdAt: c.createdAt.toISOString() })),
  };
}

/** Sets (or clears, with creditId null) what pays for one member's occurrence in a single atomic
    step — clears whichever credit currently covers it for that member first, so switching never
    leaves two credits briefly pointing at the same session. */
export async function setOccurrenceCredit(occurrenceKey: string, memberId: string, creditId: string | null): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.sessionCredit.updateMany({
      where: { appliedOccurrenceKey: occurrenceKey, memberId },
      data: { appliedOccurrenceKey: null, appliedIso: null },
    });
    if (creditId) {
      await tx.sessionCredit.update({
        where: { id: creditId },
        data: { appliedOccurrenceKey: occurrenceKey, appliedIso: isoFromOccurrenceKey(occurrenceKey) },
      });
    }
  });
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/schedule");
  revalidatePath("/classes");
}
