"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { SESSION_TYPES } from "@/data/mock/sessionTypes";
import type { SessionTypeDef } from "@/types";

/** Built-in types plus any custom ones an admin added, merged into one list for booking and display. */
export async function getSessionTypes(): Promise<SessionTypeDef[]> {
  const custom = await db.sessionType.findMany({ orderBy: { name: "asc" } });
  return [...SESSION_TYPES, ...custom.map((c) => ({ name: c.name, duration: c.duration, capacity: c.capacity, recurring: c.recurring, price: c.price }))];
}

export interface NewSessionTypeInput {
  name: string;
  duration: number;
  capacity: number;
  price: number;
  recurring: boolean;
}

export async function addSessionType(input: NewSessionTypeInput): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (SESSION_TYPES.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("That name is already a built-in session type.");
  }

  const row = await db.sessionType.create({
    data: {
      name,
      duration: Math.max(5, Math.round(input.duration)),
      capacity: Math.max(0, Math.round(input.capacity)),
      price: Math.max(0, input.price),
      recurring: input.recurring,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/schedule");
  return row.id;
}
