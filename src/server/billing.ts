"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getOccurrencesForRange } from "./schedule";
import { sessionTypeByName } from "@/data/mock/sessionTypes";
import { matchProduct } from "@/lib/matchProduct";
import { getProducts } from "./products";
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
  /** iso + start (minutes from midnight) for each entry in occurrenceKeys, same order — lets the
      tally list the actual upcoming dates, not just a count. */
  occurrenceDates: { iso: string; start: number }[];
  unitPrice: number;
}

/** Another coach's own tally block for a client also flagged on the primary coach's row — full
    item breakdown (not just a name), so "Bill via POS" can pull both coaches' sessions into one
    combined checkout when one coach handles billing on behalf of both (e.g. a shared class, or a
    studio where one person just does all the billing). */
export interface OtherCoachBlock {
  coachId: string;
  coachName: string;
  items: BillableItem[];
}

export interface BillableMemberRow {
  memberId: string;
  name: string;
  coachId: string | null;
  coachName: string;
  items: BillableItem[];
  subtotal: number;
  /** Other coaches (besides the one this tally is scoped to) who also have a Personal Training /
      Group Training session with this client in the same period — the "*" flag so a client split
      across coaches doesn't get billed by one coach without the other coach's half ever coming
      to light. Empty when the tally isn't scoped to a single coach. */
  otherCoaches: OtherCoachBlock[];
}

/** Tallies every not-yet-covered Personal Training / Group Training session in [periodFrom,
    periodTo] across all members, grouped per member. "Not-yet-covered" excludes any (occurrence,
    member) pair a SessionCredit already points to, so re-running this for the same period never
    double-counts a session that was already billed (even across separate runs, or after a
    reschedule) — scoped per member, not just per occurrence, since one Group Training slot can
    have several attendees each paying with their own credit against the same occurrence key.

    Always reads every coach's occurrences for the period (not just `coachId`'s) so it can flag
    clients who are also trained by someone else this period, even though the tally rows
    themselves stay scoped to `coachId`. */
export async function getBillableTally(periodFrom: string, periodTo: string, coachId?: string): Promise<BillableMemberRow[]> {
  const [byIso, members, coaches, existingCredits, products] = await Promise.all([
    getOccurrencesForRange(periodFrom, periodTo),
    db.member.findMany({ include: { coach: true } }),
    db.coach.findMany({ select: { id: true, name: true } }),
    db.sessionCredit.findMany({ where: { appliedIso: { gte: periodFrom, lte: periodTo } }, select: { appliedOccurrenceKey: true, memberId: true } }),
    getProducts(),
  ]);

  const covered = new Set(existingCredits.filter((c) => c.appliedOccurrenceKey).map((c) => `${c.appliedOccurrenceKey}::${c.memberId}`));
  const byName = new Map(members.map((m) => [fullName(m), m]));
  const coachNameById = new Map(coaches.map((c) => [c.id, c.name]));

  const byMember = new Map<string, BillableMemberRow>();
  // memberId -> otherCoachId -> that coach's items for this member (mirrors `items` on the row).
  const otherItemsByMemberThenCoach = new Map<string, Map<string, BillableItem[]>>();

  /** Real price for this session — the same catalog product POS would actually charge (e.g.
      "Personal Training – Cory" at $115, not the generic $50 session-type default), resolved by
      the coach who actually teaches the occurrence. */
  function priceFor(type: PreBillType, teachingCoachId: string): number {
    return matchProduct(type, teachingCoachId, products)?.price ?? sessionTypeByName(type).price;
  }

  function pushInto(items: BillableItem[], type: PreBillType, key: string, iso: string, start: number, teachingCoachId: string) {
    let item = items.find((i) => i.sessionType === type);
    if (!item) {
      item = { sessionType: type, occurrenceKeys: [], occurrenceDates: [], unitPrice: priceFor(type, teachingCoachId) };
      items.push(item);
    }
    item.occurrenceKeys.push(key);
    item.occurrenceDates.push({ iso, start });
  }

  for (const occs of Object.values(byIso)) {
    for (const occ of occs) {
      if (!PREBILL_TYPES.includes(occ.type as PreBillType)) continue;
      const type = occ.type as PreBillType;
      const names = occ.roster && occ.roster.length > 0 ? occ.roster : [occ.name];

      for (const name of names) {
        const member = byName.get(name);
        if (!member) continue;
        if (covered.has(`${occ.key}::${member.id}`)) continue;

        if (coachId && occ.coach !== coachId) {
          let byCoach = otherItemsByMemberThenCoach.get(member.id);
          if (!byCoach) {
            byCoach = new Map();
            otherItemsByMemberThenCoach.set(member.id, byCoach);
          }
          let items = byCoach.get(occ.coach);
          if (!items) {
            items = [];
            byCoach.set(occ.coach, items);
          }
          pushInto(items, type, occ.key, occ.iso, occ.start, occ.coach);
          continue;
        }

        let row = byMember.get(member.id);
        if (!row) {
          row = { memberId: member.id, name, coachId: member.coachId, coachName: member.coach?.name ?? "Unassigned", items: [], subtotal: 0, otherCoaches: [] };
          byMember.set(member.id, row);
        }
        pushInto(row.items, type, occ.key, occ.iso, occ.start, occ.coach);
      }
    }
  }

  for (const row of byMember.values()) {
    row.subtotal = row.items.reduce((a, i) => a + i.occurrenceKeys.length * i.unitPrice, 0);
    const byCoach = otherItemsByMemberThenCoach.get(row.memberId);
    if (byCoach) {
      row.otherCoaches = [...byCoach.entries()].map(([otherCoachId, items]) => ({
        coachId: otherCoachId,
        coachName: coachNameById.get(otherCoachId) ?? "another coach",
        items,
      }));
    }
  }

  return [...byMember.values()].sort((a, b) => a.name.localeCompare(b.name));
}


/** Same reconciliation as a period pre-bill, but for a single ad-hoc POS sale of Personal
    Training / Group Training sessions — auto-applies one credit per unit purchased to the
    member's soonest not-yet-covered upcoming session of that type, looking up to 180 days
    ahead. Any units bought beyond what's currently on the calendar are created unapplied
    (available), same as an unused credit from a period bill. */
export async function createSessionCreditsForSale(
  saleId: string,
  memberId: string,
  items: { sessionType: PreBillType; unitPrice: number; quantity: number; coachId?: string }[],
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

  const slotsByType = new Map<PreBillType, { key: string; coachId: string }[]>();
  for (const occs of Object.values(byIso)) {
    for (const occ of occs) {
      const type = occ.type as PreBillType;
      if (!PREBILL_TYPES.includes(type)) continue;
      const involved = occ.roster && occ.roster.length > 0 ? occ.roster.includes(name) : occ.name === name;
      if (!involved || covered.has(occ.key)) continue;
      const list = slotsByType.get(type) ?? [];
      list.push({ key: occ.key, coachId: occ.coach });
      slotsByType.set(type, list);
    }
  }

  // Only ever auto-apply a credit to a session taught by the same coach it was priced for — a
  // client trained by two different coaches doing the same session type (different rates) must
  // never have one coach's credit silently cover the other's session. No matching-coach slot
  // yet on the calendar means the credit is created unapplied, same as genuine overflow.
  function takeSlot(type: PreBillType, coachId?: string): { key: string; coachId: string } | undefined {
    const list = slotsByType.get(type);
    if (!list || list.length === 0) return undefined;
    if (!coachId) return list.shift();
    const idx = list.findIndex((s) => s.coachId === coachId);
    return idx === -1 ? undefined : list.splice(idx, 1)[0];
  }

  await db.$transaction(async (tx) => {
    for (const item of relevant) {
      for (let i = 0; i < item.quantity; i++) {
        const slot = takeSlot(item.sessionType, item.coachId);
        await tx.sessionCredit.create({
          data: {
            saleId,
            memberId,
            sessionType: item.sessionType,
            unitPrice: item.unitPrice,
            // A credit is priced for a specific coach's rate, so it stays scoped to that coach —
            // fall back to whichever coach the purchase was attributed to when there's no real
            // upcoming occurrence yet to pin it to.
            coachId: slot?.coachId ?? item.coachId ?? null,
            appliedOccurrenceKey: slot?.key ?? null,
            appliedIso: slot ? isoFromOccurrenceKey(slot.key) : null,
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
  coachId: string | null;
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
      coachId: r.coachId,
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
      coachId: r.coachId,
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
    on the Schedule/Classes detail panel. `teachingCoachId` scopes the switch-to options to
    credits bought at *this* coach's rate (or credits with no coach on file at all, the rare
    overflow case) — a credit priced for a different coach's session never shows up here, so it
    can't get silently applied at the wrong rate. */
export async function getCreditInfoForOccurrence(
  occurrenceKey: string,
  memberId: string,
  sessionType: string,
  teachingCoachId: string,
): Promise<OccurrenceCreditInfo> {
  const [applied, available] = await Promise.all([
    db.sessionCredit.findFirst({ where: { appliedOccurrenceKey: occurrenceKey, memberId } }),
    db.sessionCredit.findMany({
      where: { memberId, sessionType, appliedOccurrenceKey: null, OR: [{ coachId: teachingCoachId }, { coachId: null }] },
      orderBy: { createdAt: "asc" },
    }),
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
