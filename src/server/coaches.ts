"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
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
}): CoachRow {
  return { ...row, notifyFlags: row.notifyFlags as CoachRow["notifyFlags"] };
}

export async function getCoaches(): Promise<CoachRow[]> {
  const rows = await db.coach.findMany({ orderBy: { name: "asc" } });
  return rows.map(toCoachRow);
}

/**
 * The coach record matching the signed-in Clerk user's email, if any. Since coaches don't (yet) have
 * their own Clerk logins, this is how we know "who is this" and "are they an admin" — by email match
 * against the coach roster, rather than a separate account-linking step.
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

export async function addCoach(input: NewCoachInput): Promise<string> {
  const requester = await getCurrentCoach();
  if (!requester?.isAdmin) throw new Error("Only an admin can add a coach.");

  const name = input.name.trim();
  const email = input.email.trim();
  if (!name || !email) throw new Error("Name and email are required.");

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
