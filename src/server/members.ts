"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import type { Member } from "@/types";

function toMember(row: { id: string; name: string; email: string; phone: string; plan: string; balance: unknown; since: string; lastSession: string; coach: { name: string } | null }): Member {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    plan: row.plan,
    balance: Number(row.balance),
    since: row.since,
    lastSession: row.lastSession,
    coach: row.coach?.name ?? "Unassigned",
  };
}

export async function getMembers(): Promise<Member[]> {
  const rows = await db.member.findMany({ include: { coach: true }, orderBy: { name: "asc" } });
  return rows.map(toMember);
}

export async function getMemberById(id: string): Promise<Member | null> {
  const row = await db.member.findUnique({ where: { id }, include: { coach: true } });
  return row ? toMember(row) : null;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface NewMemberInput {
  name: string;
  email: string;
  phone: string;
  plan: string;
}

export async function addMember(input: NewMemberInput): Promise<string> {
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name || !email) throw new Error("Name and email are required.");

  const coach = await db.coach.findFirst({ where: { active: true }, orderBy: { name: "asc" } });
  const now = new Date();

  const row = await db.member.create({
    data: {
      name,
      email,
      phone: input.phone.trim(),
      plan: input.plan,
      balance: 0,
      since: `${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`,
      lastSession: "No sessions yet",
      coachId: coach?.id,
    },
  });

  revalidatePath("/members");
  return row.id;
}

export interface SharedAccountLinks {
  /** Members this person is approved to purchase for. */
  paysFor: string[];
  /** Members whose account pays for this person. */
  paidBy: string[];
}

export async function getSharedAccountLinks(memberId: string): Promise<SharedAccountLinks> {
  const [asPayer, asBeneficiary] = await Promise.all([
    db.sharedAccount.findMany({ where: { payerId: memberId }, include: { beneficiary: true } }),
    db.sharedAccount.findMany({ where: { beneficiaryId: memberId }, include: { payer: true } }),
  ]);
  return {
    paysFor: asPayer.map((r) => r.beneficiary.name),
    paidBy: asBeneficiary.map((r) => r.payer.name),
  };
}

export async function addSharedAccount(payerId: string, beneficiaryName: string): Promise<void> {
  const beneficiary = await db.member.findFirst({ where: { name: beneficiaryName } });
  if (!beneficiary) return;
  await db.sharedAccount.upsert({
    where: { payerId_beneficiaryId: { payerId, beneficiaryId: beneficiary.id } },
    create: { payerId, beneficiaryId: beneficiary.id },
    update: {},
  });
  revalidatePath(`/members/${payerId}`);
}

export async function removeSharedAccount(payerId: string, beneficiaryName: string): Promise<void> {
  const beneficiary = await db.member.findFirst({ where: { name: beneficiaryName } });
  if (!beneficiary) return;
  await db.sharedAccount.deleteMany({ where: { payerId, beneficiaryId: beneficiary.id } });
  revalidatePath(`/members/${payerId}`);
}
