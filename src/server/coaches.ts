"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";

export interface CoachRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export async function getCoaches(): Promise<CoachRow[]> {
  return db.coach.findMany({ orderBy: { name: "asc" } });
}

export interface NewCoachInput {
  name: string;
  email: string;
  role: string;
}

export async function addCoach(input: NewCoachInput): Promise<string> {
  const name = input.name.trim();
  const email = input.email.trim();
  const role = input.role.trim();
  if (!name || !email || !role) throw new Error("Name, email, and role are required.");

  const row = await db.coach.create({ data: { name, email, role, active: true } });
  revalidatePath("/settings");
  revalidatePath("/schedule");
  return row.id;
}
