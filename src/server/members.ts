"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
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
  plan: string;
  since: string;
  lastSession: string;
  coach: { name: string } | null;
  sales: { total: unknown }[];
}

function fullName(row: { firstName: string; lastName: string }): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

/** Balance due is computed live from unpaid sales — there's no stored balance column to drift out of sync. */
const UNPAID_SALES_INCLUDE = { where: { paid: false }, select: { total: true } } as const;

function toMember(row: MemberRow): Member {
  const balance = row.sales.reduce((a, s) => a + Number(s.total), 0);
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
    since: row.since,
    lastSession: row.lastSession,
    coach: row.coach?.name ?? "Unassigned",
    address: row.address ?? undefined,
    postalCode: row.postalCode ?? undefined,
    city: row.city ?? undefined,
    province: row.province ?? undefined,
  };
}

export async function getMembers(): Promise<Member[]> {
  const rows = await db.member.findMany({
    include: { coach: true, sales: UNPAID_SALES_INCLUDE },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return rows.map(toMember);
}

export async function getMemberById(id: string): Promise<Member | null> {
  const row = await db.member.findUnique({ where: { id }, include: { coach: true, sales: UNPAID_SALES_INCLUDE } });
  return row ? toMember(row) : null;
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
      plan: "No plan yet",
      since: `${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`,
      lastSession: "No sessions yet",
      coachId: coach?.id,
    },
  });

  revalidatePath("/members");
  return row.id;
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
