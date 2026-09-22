"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { getLastSessionByName } from "./schedule";
import { clock, formatDateShort } from "@/lib/time";
import type { Member } from "@/types";

interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  dateOfBirth: Date | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  plan: string;
  since: string;
  coach: { name: string } | null;
  sales: { total: unknown; paid: boolean }[];
}

function fullName(row: { firstName: string; lastName: string }): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

/** Balance due and lifetime spend are both computed live from real sales — there's no stored
    column for either to drift out of sync (same reasoning for both: unpaid sum vs. paid sum). */
const ALL_SALES_INCLUDE = { select: { total: true, paid: true } } as const;

/** "Last session" is computed live from real bookings/recurring series — same reasoning as balance above. */
function formatLastSession(hit: { iso: string; start: number } | undefined): string {
  if (!hit) return "No sessions yet";
  return `${formatDateShort(new Date(`${hit.iso}T00:00:00`))} · ${clock(hit.start)}`;
}

function toMember(row: MemberRow, lastSession: string): Member {
  const balance = row.sales.filter((s) => !s.paid).reduce((a, s) => a + Number(s.total), 0);
  const lifetimeSpend = row.sales.filter((s) => s.paid).reduce((a, s) => a + Number(s.total), 0);
  return {
    id: row.id,
    name: fullName(row),
    firstName: row.firstName,
    lastName: row.lastName,
    gender: row.gender,
    email: row.email,
    phone: row.phone,
    plan: row.plan,
    balance,
    lifetimeSpend,
    since: row.since,
    lastSession,
    coach: row.coach?.name ?? "Unassigned",
    address: row.address ?? undefined,
    postalCode: row.postalCode ?? undefined,
    city: row.city ?? undefined,
    province: row.province ?? undefined,
    dateOfBirth: row.dateOfBirth ? row.dateOfBirth.toISOString().slice(0, 10) : undefined,
    emergencyContactName: row.emergencyContactName ?? undefined,
    emergencyContactPhone: row.emergencyContactPhone ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function getMembers(): Promise<Member[]> {
  const rows = await db.member.findMany({
    include: { coach: true, sales: ALL_SALES_INCLUDE },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const lastSessions = await getLastSessionByName(rows.map(fullName));
  return rows.map((row) => toMember(row, formatLastSession(lastSessions[fullName(row)])));
}

export async function getMemberById(id: string): Promise<Member | null> {
  const row = await db.member.findUnique({ where: { id }, include: { coach: true, sales: ALL_SALES_INCLUDE } });
  if (!row) return null;
  const lastSessions = await getLastSessionByName([fullName(row)]);
  return toMember(row, formatLastSession(lastSessions[fullName(row)]));
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface NewMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export async function addMember(input: NewMemberInput): Promise<string> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const gender = input.gender.trim();
  if (!firstName || !lastName || !email || !phone || !gender) {
    throw new Error("First name, last name, email, phone, and gender are required.");
  }

  const coach = await db.coach.findFirst({ where: { active: true }, orderBy: { name: "asc" } });
  const now = new Date();

  const row = await db.member.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      gender,
      address: input.address?.trim() || undefined,
      postalCode: input.postalCode?.trim() || undefined,
      city: input.city?.trim() || undefined,
      province: input.province?.trim() || undefined,
      dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00Z`) : undefined,
      emergencyContactName: input.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      plan: "No plan yet",
      since: `${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`,
      coachId: coach?.id,
    },
  });

  revalidatePath("/members");
  return row.id;
}

export interface MemberDetailsInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export async function updateMemberDetails(memberId: string, input: MemberDetailsInput): Promise<void> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const gender = input.gender.trim();
  if (!firstName || !lastName || !email || !phone || !gender) {
    throw new Error("First name, last name, email, phone, and gender are required.");
  }

  await db.member.update({
    where: { id: memberId },
    data: {
      firstName,
      lastName,
      email,
      phone,
      gender,
      address: input.address?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      city: input.city?.trim() || null,
      province: input.province?.trim() || null,
      dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00Z`) : null,
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
}


export interface MembershipInfo {
  name: string;
  price: number;
  status: string;
  nextBillDate: string | null;
  lastBillAt: string | null;
  lastBillStatus: string | null;
  lastBillError: string | null;
}

export async function getMembershipInfo(memberId: string): Promise<MembershipInfo | null> {
  const member = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      membershipName: true,
      membershipPrice: true,
      membershipStatus: true,
      nextBillDate: true,
      lastBillAt: true,
      lastBillStatus: true,
      lastBillError: true,
    },
  });
  if (member.membershipStatus === "none" || !member.membershipName || !member.membershipPrice) return null;
  return {
    name: member.membershipName,
    price: Number(member.membershipPrice),
    status: member.membershipStatus,
    nextBillDate: member.nextBillDate,
    lastBillAt: member.lastBillAt?.toISOString() ?? null,
    lastBillStatus: member.lastBillStatus,
    lastBillError: member.lastBillError,
  };
}

/** Sets up (or edits) a member's recurring membership — activates billing starting on
    `nextBillDate`. Resets the failure counter/status so editing a plan after a "failed" state
    (e.g. staff fixed the card) puts it straight back to actively retrying. */
export async function setMembership(memberId: string, input: { name: string; price: number; nextBillDate: string }): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Membership name is required.");
  if (!(input.price > 0)) throw new Error("Membership price must be greater than 0.");
  if (!input.nextBillDate) throw new Error("Next bill date is required.");

  await db.member.update({
    where: { id: memberId },
    data: {
      membershipName: name,
      membershipPrice: input.price,
      membershipStatus: "active",
      nextBillDate: input.nextBillDate,
      billFailCount: 0,
      lastBillError: null,
    },
  });
  revalidatePath(`/members/${memberId}`);
}

export async function pauseMembership(memberId: string): Promise<void> {
  await db.member.update({ where: { id: memberId }, data: { membershipStatus: "paused" } });
  revalidatePath(`/members/${memberId}`);
}

export async function resumeMembership(memberId: string): Promise<void> {
  await db.member.update({
    where: { id: memberId },
    data: { membershipStatus: "active", billFailCount: 0, lastBillError: null },
  });
  revalidatePath(`/members/${memberId}`);
}

export interface SharedAccountLink {
  id: string;
  name: string;
}

export interface SharedAccountLinks {
  /** Members this person is approved to purchase for. */
  paysFor: SharedAccountLink[];
  /** Members whose account pays for this person. */
  paidBy: SharedAccountLink[];
}

export async function getSharedAccountLinks(memberId: string): Promise<SharedAccountLinks> {
  const [asPayer, asBeneficiary] = await Promise.all([
    db.sharedAccount.findMany({ where: { payerId: memberId }, include: { beneficiary: true } }),
    db.sharedAccount.findMany({ where: { beneficiaryId: memberId }, include: { payer: true } }),
  ]);
  return {
    paysFor: asPayer.map((r) => ({ id: r.beneficiary.id, name: fullName(r.beneficiary) })),
    paidBy: asBeneficiary.map((r) => ({ id: r.payer.id, name: fullName(r.payer) })),
  };
}

export async function addSharedAccount(payerId: string, beneficiaryId: string): Promise<void> {
  await db.sharedAccount.upsert({
    where: { payerId_beneficiaryId: { payerId, beneficiaryId } },
    create: { payerId, beneficiaryId },
    update: {},
  });
  revalidatePath(`/members/${payerId}`);
}

export async function removeSharedAccount(payerId: string, beneficiaryId: string): Promise<void> {
  await db.sharedAccount.deleteMany({ where: { payerId, beneficiaryId } });
  revalidatePath(`/members/${payerId}`);
}

export interface MergeMembersInput {
  /** The record that survives — its id stays the same, so existing links (e.g. POS/profile URLs) still work. */
  keepId: string;
  /** The duplicate being merged in and deleted. */
  removeId: string;
  /** Final field values for the surviving record — the dialog lets the admin pick each from either duplicate. */
  fields: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: string;
    address?: string;
    postalCode?: string;
    city?: string;
    province?: string;
    plan: string;
    since: string;
    coachId?: string;
  };
}

/**
 * Merges two duplicate member records. Sales and shared-account links move to the surviving
 * record by foreign key. Scheduling data (bookings, recurring series, waitlists, class add-ins,
 * attendance) isn't linked by id — it's matched by name string — so every occurrence referencing
 * either duplicate's old name is re-pointed to the merged record's final name.
 */
export async function mergeMembers(input: MergeMembersInput): Promise<void> {
  const requester = await getCurrentCoach();
  if (!requester?.isAdmin) throw new Error("Only an admin can merge members.");
  if (input.keepId === input.removeId) throw new Error("Pick two different members.");

  const [keep, remove] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: input.keepId } }),
    db.member.findUniqueOrThrow({ where: { id: input.removeId } }),
  ]);

  const oldKeepName = fullName(keep);
  const oldRemoveName = fullName(remove);
  const newName = `${input.fields.firstName} ${input.fields.lastName}`.trim();
  const oldNames = [...new Set([oldKeepName, oldRemoveName])].filter((n) => n && n !== newName);

  await db.$transaction(async (tx) => {
    // Sales move to the survivor by foreign key.
    await tx.sale.updateMany({ where: { memberId: remove.id }, data: { memberId: keep.id } });

    // Shared-account links: move to the survivor, skip self-links, and drop (not duplicate) a
    // link the survivor already has to the same other member.
    const asPayer = await tx.sharedAccount.findMany({ where: { payerId: remove.id } });
    for (const link of asPayer) {
      if (link.beneficiaryId === keep.id) continue;
      await tx.sharedAccount.upsert({
        where: { payerId_beneficiaryId: { payerId: keep.id, beneficiaryId: link.beneficiaryId } },
        create: { payerId: keep.id, beneficiaryId: link.beneficiaryId },
        update: {},
      });
    }
    const asBeneficiary = await tx.sharedAccount.findMany({ where: { beneficiaryId: remove.id } });
    for (const link of asBeneficiary) {
      if (link.payerId === keep.id) continue;
      await tx.sharedAccount.upsert({
        where: { payerId_beneficiaryId: { payerId: link.payerId, beneficiaryId: keep.id } },
        create: { payerId: link.payerId, beneficiaryId: keep.id },
        update: {},
      });
    }

    // Re-point every schedule reference (by name) from either duplicate's old name to the final name.
    if (oldNames.length > 0) {
      await tx.booking.updateMany({ where: { name: { in: oldNames } }, data: { name: newName } });
      await tx.recurringSeries.updateMany({ where: { clientName: { in: oldNames } }, data: { clientName: newName } });

      const rosterBookings = await tx.booking.findMany({ where: { roster: { hasSome: oldNames } } });
      for (const b of rosterBookings) {
        const roster = [...new Set(b.roster.map((n) => (oldNames.includes(n) ? newName : n)))];
        await tx.booking.update({ where: { id: b.id }, data: { roster } });
      }

      for (const oldName of oldNames) {
        const waitRows = await tx.waitlistEntry.findMany({ where: { memberName: oldName } });
        for (const w of waitRows) {
          const dupe = await tx.waitlistEntry.findUnique({ where: { occurrenceKey_memberName: { occurrenceKey: w.occurrenceKey, memberName: newName } } });
          if (dupe) await tx.waitlistEntry.delete({ where: { id: w.id } });
          else await tx.waitlistEntry.update({ where: { id: w.id }, data: { memberName: newName } });
        }

        const addRows = await tx.classAddIn.findMany({ where: { memberName: oldName } });
        for (const a of addRows) {
          const dupe = await tx.classAddIn.findUnique({ where: { occurrenceKey_memberName: { occurrenceKey: a.occurrenceKey, memberName: newName } } });
          if (dupe) await tx.classAddIn.delete({ where: { id: a.id } });
          else await tx.classAddIn.update({ where: { id: a.id }, data: { memberName: newName } });
        }

        // Attendance rows are keyed "iso-start-coachId-name" — recompute the key with the new name.
        const attRows = await tx.attendanceRecord.findMany({ where: { slotKey: { endsWith: `-${oldName}` } } });
        for (const row of attRows) {
          const prefix = row.slotKey.slice(0, row.slotKey.length - oldName.length - 1);
          const newKey = `${prefix}-${newName}`;
          await tx.attendanceRecord.delete({ where: { slotKey: row.slotKey } });
          await tx.attendanceRecord.upsert({ where: { slotKey: newKey }, create: { slotKey: newKey, iso: row.iso, status: row.status }, update: { status: row.status } });
        }
      }
    }

    // Delete the duplicate last — its dependents have already been moved off it, and this frees
    // up its email before the survivor is updated (email is unique).
    await tx.member.delete({ where: { id: remove.id } });

    await tx.member.update({
      where: { id: keep.id },
      data: {
        firstName: input.fields.firstName,
        lastName: input.fields.lastName,
        email: input.fields.email,
        phone: input.fields.phone,
        gender: input.fields.gender,
        address: input.fields.address,
        postalCode: input.fields.postalCode,
        city: input.fields.city,
        province: input.fields.province,
        // Not dialog-pickable — the two duplicates are the same real person, so just keep
        // whichever record already has each value set, preferring the survivor's.
        dateOfBirth: keep.dateOfBirth ?? remove.dateOfBirth,
        emergencyContactName: keep.emergencyContactName ?? remove.emergencyContactName,
        emergencyContactPhone: keep.emergencyContactPhone ?? remove.emergencyContactPhone,
        plan: input.fields.plan,
        since: input.fields.since,
        coachId: input.fields.coachId,
      },
    });
  });

  revalidatePath("/members");
  revalidatePath(`/members/${keep.id}`);
  revalidatePath("/schedule");
  revalidatePath("/classes");
}
