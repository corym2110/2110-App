import type { Member } from "@/types";

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// [name, plan, coach, lastSession, balance, since, phone, email]
const RAW: [string, string, string, string, number, string, string, string][] = [];

export const MEMBERS: Member[] = RAW.map(([name, plan, coach, lastSession, balance, since, phone, email]) => ({
  id: slug(name),
  name,
  plan,
  coach,
  lastSession,
  balance,
  since,
  phone,
  email,
}));

export function memberByName(name: string): Member | undefined {
  return MEMBERS.find((m) => m.name.toLowerCase() === name.toLowerCase());
}

export function memberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** payer name -> member names they're approved to purchase for. Seed default, editable at runtime. */
export const DEFAULT_SHARED_ACCOUNTS: Record<string, string[]> = {};
