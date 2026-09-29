"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { getLastSessionByName, getWeeklyVisitCounts, getUpcomingSessionCounts } from "./schedule";
import { logAudit, getAuditLogForTarget } from "./auditLog";
import { computeRiskReasons, CHURN_RISK_WEEKS_BACK, CHURN_RISK_UPCOMING_DAYS } from "./churnRisk";
import { clock, formatDateShort } from "@/lib/time";
import { parseInput } from "@/lib/validate";
import { runAction, type ActionResult } from "@/lib/actionResult";
import {
  MemberDetailsInputSchema,
  SetMembershipInputSchema,
  MergeMembersInputSchema,
  type NewMemberInput,
  type MemberDetailsInput,
  type MergeMembersInput,
} from "@/lib/schemas";
import type { Member } from "@/types";

export type { NewMemberInput, MemberDetailsInput, MergeMembersInput };

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
  membershipStatus: string;
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

function toMember(row: MemberRow, lastSession: string, riskReasons: string[]): Member {
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
    riskReasons,
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
  const names = rows.map(fullName);
  const [lastSessions, weeklyVisits, upcomingCounts] = await Promise.all([
    getLastSessionByName(names),
    getWeeklyVisitCounts(names, CHURN_RISK_WEEKS_BACK),
    getUpcomingSessionCounts(names, CHURN_RISK_UPCOMING_DAYS),
  ]);
  return rows.map((row) => {
    const name = fullName(row);
    const riskReasons = computeRiskReasons({
      membershipStatus: row.membershipStatus,
      weeklyVisits: weeklyVisits[name] ?? [],
      upcomingCount: upcomingCounts[name] ?? 0,
    });
    return toMember(row, formatLastSession(lastSessions[name]), riskReasons);
  });
}

export async function getMemberById(id: string): Promise<Member | null> {
  const row = await db.member.findUnique({ where: { id }, include: { coach: true, sales: ALL_SALES_INCLUDE } });
  if (!row) return null;
  const name = fullName(row);
  const [lastSessions, weeklyVisits, upcomingCounts] = await Promise.all([
    getLastSessionByName([name]),
    getWeeklyVisitCounts([name], CHURN_RISK_WEEKS_BACK),
    getUpcomingSessionCounts([name], CHURN_RISK_UPCOMING_DAYS),
  ]);
  const riskReasons = computeRiskReasons({
    membershipStatus: row.membershipStatus,
    weeklyVisits: weeklyVisits[name] ?? [],
    upcomingCount: upcomingCounts[name] ?? 0,
  });

  const actor = await getCurrentCoach();
  await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.view", targetType: "Member", targetId: row.id });

  return toMember(row, formatLastSession(lastSessions[name]), riskReasons);
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "member.create": "Added member",
  "member.update": "Updated details",
  "member.merge": "Merged duplicate member",
  "member.setMembership": "Set membership",
  "member.pause": "Paused membership",
  "member.resume": "Resumed membership",
  "member.sharedAccount.add": "Linked shared account",
  "member.sharedAccount.remove": "Removed shared account",
  "member.waiver.sign": "Signed waiver",
  "member.waiver.view": "Viewed waiver",
  "member.view": "Viewed profile",
  "member.bodpod.log": "Logged BodPod scan",
  "member.bodpod.delete": "Deleted BodPod scan",
};

export interface AuditLogRow {
  id: string;
  actorName: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

/** Last 10 audit entries for a member's record — writes and sensitive views (waiver access,
    profile view) alike. Excludes nothing per-record; bulk listings (getMembers) are never logged. */
export async function getMemberAuditLog(memberId: string): Promise<AuditLogRow[]> {
  const rows = await getAuditLogForTarget("Member", memberId);
  return rows.map((r) => ({
    id: r.id,
    actorName: r.actorName,
    action: AUDIT_ACTION_LABELS[r.action] ?? r.action,
    detail: r.detail,
    createdAt: r.createdAt.toISOString(),
  }));
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Prisma's raw "Unique constraint failed on the fields: (`email`)" is not something to show a
    real user — translate the one unique field members actually has into plain language. */
function friendlyMemberError(e: unknown): never {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
    throw new Error("That email is already in use by another member.");
  }
  throw e;
}

export async function addMember(input: NewMemberInput): Promise<ActionResult<string>> {
  return runAction(async () => {
    const data = parseInput(MemberDetailsInputSchema, input);

    const coach = await db.coach.findFirst({ where: { active: true }, orderBy: { name: "asc" } });
    const now = new Date();

    const row = await db.member
      .create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          gender: data.gender,
          address: data.address || undefined,
          postalCode: data.postalCode || undefined,
          city: data.city || undefined,
          province: data.province || undefined,
          dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00Z`) : undefined,
          emergencyContactName: data.emergencyContactName || undefined,
          emergencyContactPhone: data.emergencyContactPhone || undefined,
          notes: data.notes || undefined,
          plan: "No plan yet",
          since: `${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`,
          coachId: coach?.id,
        },
      })
      .catch(friendlyMemberError);

    const actor = await getCurrentCoach();
    await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.create", targetType: "Member", targetId: row.id });

    revalidatePath("/members");
    return row.id;
  });
}

export async function updateMemberDetails(memberId: string, input: MemberDetailsInput): Promise<ActionResult> {
  return runAction(async () => {
    const data = parseInput(MemberDetailsInputSchema, input);

    await db.member
      .update({
        where: { id: memberId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          gender: data.gender,
          address: data.address || null,
          postalCode: data.postalCode || null,
          city: data.city || null,
          province: data.province || null,
          dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00Z`) : null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          notes: data.notes || null,
        },
      })
      .catch(friendlyMemberError);

    const actor = await getCurrentCoach();
    await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.update", targetType: "Member", targetId: memberId });

    revalidatePath("/members");
    revalidatePath(`/members/${memberId}`);
  });
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
export async function setMembership(memberId: string, input: { name: string; price: number; nextBillDate: string }): Promise<ActionResult> {
  return runAction(async () => {
    const data = parseInput(SetMembershipInputSchema, input);

    await db.member.update({
      where: { id: memberId },
      data: {
        membershipName: data.name,
        membershipPrice: data.price,
        membershipStatus: "active",
        nextBillDate: data.nextBillDate,
        billFailCount: 0,
        lastBillError: null,
      },
    });

    const actor = await getCurrentCoach();
    await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.setMembership", targetType: "Member", targetId: memberId });

    revalidatePath(`/members/${memberId}`);
  });
}

export async function pauseMembership(memberId: string): Promise<void> {
  await db.member.update({ where: { id: memberId }, data: { membershipStatus: "paused" } });

  const actor = await getCurrentCoach();
  await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.pause", targetType: "Member", targetId: memberId });

  revalidatePath(`/members/${memberId}`);
}

export async function resumeMembership(memberId: string): Promise<void> {
  await db.member.update({
    where: { id: memberId },
    data: { membershipStatus: "active", billFailCount: 0, lastBillError: null },
  });

  const actor = await getCurrentCoach();
  await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.resume", targetType: "Member", targetId: memberId });

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

  const actor = await getCurrentCoach();
  await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.sharedAccount.add", targetType: "Member", targetId: payerId, detail: beneficiaryId });

  revalidatePath(`/members/${payerId}`);
}

export async function removeSharedAccount(payerId: string, beneficiaryId: string): Promise<void> {
  await db.sharedAccount.deleteMany({ where: { payerId, beneficiaryId } });

  const actor = await getCurrentCoach();
  await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.sharedAccount.remove", targetType: "Member", targetId: payerId, detail: beneficiaryId });

  revalidatePath(`/members/${payerId}`);
}

/**
 * Merges two duplicate member records. Sales and shared-account links move to the surviving
 * record by foreign key. Scheduling data (bookings, recurring series, waitlists, class add-ins,
 * attendance) isn't linked by id — it's matched by name string — so every occurrence referencing
 * either duplicate's old name is re-pointed to the merged record's final name.
 */
export async function mergeMembers(input: MergeMembersInput): Promise<ActionResult> {
  return runAction(async () => {
    const requester = await getCurrentCoach();
    if (!requester?.isAdmin) throw new Error("Only an admin can merge members.");
    const parsed = parseInput(MergeMembersInputSchema, input);
    if (parsed.keepId === parsed.removeId) throw new Error("Pick two different members.");
  
    const [keep, remove] = await Promise.all([
      db.member.findUniqueOrThrow({ where: { id: parsed.keepId } }),
      db.member.findUniqueOrThrow({ where: { id: parsed.removeId } }),
    ]);
  
    const oldKeepName = fullName(keep);
    const oldRemoveName = fullName(remove);
    const newName = `${parsed.fields.firstName} ${parsed.fields.lastName}`.trim();
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
          firstName: parsed.fields.firstName,
          lastName: parsed.fields.lastName,
          email: parsed.fields.email,
          phone: parsed.fields.phone,
          gender: parsed.fields.gender,
          address: parsed.fields.address,
          postalCode: parsed.fields.postalCode,
          city: parsed.fields.city,
          province: parsed.fields.province,
          // Not dialog-pickable — the two duplicates are the same real person, so just keep
          // whichever record already has each value set, preferring the survivor's.
          dateOfBirth: keep.dateOfBirth ?? remove.dateOfBirth,
          emergencyContactName: keep.emergencyContactName ?? remove.emergencyContactName,
          emergencyContactPhone: keep.emergencyContactPhone ?? remove.emergencyContactPhone,
          plan: parsed.fields.plan,
          since: parsed.fields.since,
          coachId: parsed.fields.coachId,
        },
      });
    });
  
    await logAudit({ actorId: requester.id, actorName: requester.name, action: "member.merge", targetType: "Member", targetId: keep.id, detail: remove.id });

    revalidatePath("/members");
    revalidatePath(`/members/${keep.id}`);
    revalidatePath("/schedule");
    revalidatePath("/classes");
  });
}
