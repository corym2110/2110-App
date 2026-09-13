import type { SessionTypeDef, SessionTypeName } from "@/types";

export const SESSION_TYPES: SessionTypeDef[] = [
  { name: "Personal Training", duration: 60, capacity: 0, recurring: true, price: 50 },
  { name: "Group Training", duration: 60, capacity: 8, recurring: true, price: 30 },
  { name: "Class", duration: 60, capacity: 12, recurring: false, price: 20 },
  { name: "Remote Consult", duration: 15, capacity: 0, recurring: false, price: 40 },
  { name: "Bodpod", duration: 30, capacity: 0, recurring: false, price: 45 },
  { name: "Blueprint and Baseline", duration: 90, capacity: 0, recurring: false, price: 0 },
];

/** Named sessions override the type's default capacity. */
export const NAMED_CAPACITY: Record<string, number> = {
  "Recovery class": 10,
  Conditioning: 14,
};

export function sessionTypeByName(name: SessionTypeName): SessionTypeDef {
  const found = SESSION_TYPES.find((t) => t.name === name);
  if (!found) throw new Error(`Unknown session type: ${name}`);
  return found;
}

export function capacityOf(type: SessionTypeName, title?: string): number {
  if (title && NAMED_CAPACITY[title] != null) return NAMED_CAPACITY[title];
  return sessionTypeByName(type).capacity;
}

const LIGHT_COLORS: Record<SessionTypeName, string> = {
  "Personal Training": "#0f6e6b",
  "Group Training": "#2f6f8f",
  "Remote Consult": "#8a6a24",
  Class: "#3d7a52",
  Bodpod: "#8f4a5c",
  "Blueprint and Baseline": "#5c6270",
};

const DARK_COLORS: Record<SessionTypeName, string> = {
  "Personal Training": "#9184d9",
  "Group Training": "#6fb3c8",
  "Remote Consult": "#c8a86f",
  Class: "#8fc79f",
  Bodpod: "#c88f9f",
  "Blueprint and Baseline": "#9a9fb5",
};

export function sessionTypeColor(type: SessionTypeName, isDark: boolean): string {
  return (isDark ? DARK_COLORS : LIGHT_COLORS)[type];
}

export const SHORT_LABEL: Record<SessionTypeName, string> = {
  "Personal Training": "PT",
  "Group Training": "Group",
  "Remote Consult": "Remote",
  Class: "Class",
  Bodpod: "Bodpod",
  "Blueprint and Baseline": "Blueprint and Baseline",
};
