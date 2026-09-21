"use server";

import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "./db";

export interface CoachRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
  notifyFlags: { dayAhead: boolean; manualBooking: boolean; classJoin: boolean } | null;
  landing: string;
  calendarView: string;
  commissionRate: number;
}

function toCoachRow(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
  notifyFlags: unknown;
  landing: string;
  calendarView: string;
  commissionRate: number;
}): CoachRow {
  return { ...row, notifyFlags: row.notifyFlags as CoachRow["notifyFlags"] };
}

export async function getCoaches(): Promise<CoachRow[]> {
  const rows = await db.coach.findMany({ orderBy: { name: "asc" } });
  return rows.map(toCoachRow);
}

/**
 * The coach record matching the signed-in Clerk user's email, if any. Coaches get their Clerk login by
 * accepting an email invite (see addCoach) rather than a separate account-linking step, so this is how
 * we know "who is this" and "are they an admin" — by email match against the coach roster.
 */
export async function getCurrentCoach(): Promise<CoachRow | null> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;
  const row = await db.coach.findUnique({ where: { email } });
  return row ? toCoachRow(row) : null;
}

export interface NewCoachInput {
  name: string;
  email: string;
  isAdmin?: boolean;
}

/** Absolute origin of the request (works in dev, previews, and prod) so the invite email links back here. */
async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function addCoach(input: NewCoachInput): Promise<string> {
  const requester = await getCurrentCoach();
  if (!requester?.isAdmin) throw new Error("Only an admin can add a coach.");

  const name = input.name.trim();
  const email = input.email.trim();
  if (!name || !email) throw new Error("Name and email are required.");

  // Send the invite first — if Clerk rejects it (bad address, already invited), nothing is
  // written to our own database, so a failed invite never leaves an orphaned coach record.
  const client = await clerkClient();
  await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${await currentOrigin()}/sign-up`,
    publicMetadata: { role: input.isAdmin ? "admin" : "coach" },
  });

  const row = await db.coach.create({ data: { name, email, role: "Coach", active: true, isAdmin: !!input.isAdmin } });
  revalidatePath("/settings");
  revalidatePath("/schedule");
  return row.id;
}

export interface CoachPreferencesInput {
  notifyFlags: { dayAhead: boolean; manualBooking: boolean; classJoin: boolean };
  landing: string;
  calendarView: string;
}

export async function updateCoachPreferences(coachId: string, input: CoachPreferencesInput): Promise<void> {
  await db.coach.update({
    where: { id: coachId },
    data: { notifyFlags: input.notifyFlags as object, landing: input.landing, calendarView: input.calendarView },
  });
  revalidatePath("/preferences");
}

/** `rate` is a fraction (0.25 = 25%) — admin-only, since this sets what a coach actually gets paid. */
export async function updateCoachCommissionRate(coachId: string, rate: number): Promise<void> {
  const requester = await getCurrentCoach();
  if (!requester?.isAdmin) throw new Error("Only an admin can set a coach's commission rate.");
  if (!(rate >= 0 && rate <= 1)) throw new Error("Commission rate must be between 0% and 100%.");

  await db.coach.update({ where: { id: coachId }, data: { commissionRate: rate } });
  revalidatePath("/settings");
  revalidatePath("/payroll");
}
