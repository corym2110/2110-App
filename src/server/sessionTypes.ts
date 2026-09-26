"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { parseInput } from "@/lib/validate";
import { NewSessionTypeInputSchema, type NewSessionTypeInput } from "@/lib/schemas";
import { SESSION_TYPES } from "@/data/mock/sessionTypes";
import type { SessionTypeDef } from "@/types";

export type { NewSessionTypeInput };

/** Built-in types plus any custom ones an admin added, merged into one list for booking and display. */
export async function getSessionTypes(): Promise<SessionTypeDef[]> {
  const custom = await db.sessionType.findMany({ orderBy: { name: "asc" } });
  return [...SESSION_TYPES, ...custom.map((c) => ({ name: c.name, duration: c.duration, capacity: c.capacity, recurring: c.recurring, price: c.price }))];
}

export async function addSessionType(input: NewSessionTypeInput): Promise<string> {
  const data = parseInput(NewSessionTypeInputSchema, input);
  if (SESSION_TYPES.some((t) => t.name.toLowerCase() === data.name.toLowerCase())) {
    throw new Error("That name is already a built-in session type.");
  }

  const row = await db.sessionType.create({
    data: {
      name: data.name,
      duration: data.duration,
      capacity: data.capacity,
      price: data.price,
      recurring: data.recurring,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/schedule");
  return row.id;
}
