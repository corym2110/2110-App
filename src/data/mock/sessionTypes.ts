import type { SessionTypeDef, SessionTypeName } from "@/types";

export const SESSION_TYPES: SessionTypeDef[] = [
  { name: "Personal Training", duration: 60, capacity: 0, recurring: true, price: 50 },
  { name: "Group Training", duration: 60, capacity: 8, recurring: true, price: 30 },
  { name: "Class", duration: 60, capacity: 12, recurring: true, price: 20 },
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

/** Capacity for a type, honoring a named-session override (e.g. "Recovery class"). For a custom
    type not among the six built-ins, pass its own capacity as `fallbackCapacity` (e.g. from the
    occurrence itself, which carries the capacity it was booked with) instead of throwing. */
export function capacityOf(type: SessionTypeName, title?: string, fallbackCapacity = 0): number {
  if (title && NAMED_CAPACITY[title] != null) return NAMED_CAPACITY[title];
  return SESSION_TYPES.find((t) => t.name === type)?.capacity ?? fallbackCapacity;
}

const LIGHT_COLORS: Record<string, string> = {
  "Personal Training": "#0f6e6b",
  "Group Training": "#2f6f8f",
  "Remote Consult": "#8a6a24",
  Class: "#3d7a52",
  Bodpod: "#8f4a5c",
  "Blueprint and Baseline": "#5c6270",
};

const DARK_COLORS: Record<string, string> = {
  "Personal Training": "#9184d9",
  "Group Training": "#6fb3c8",
  "Remote Consult": "#c8a86f",
  Class: "#8fc79f",
  Bodpod: "#c88f9f",
  "Blueprint and Baseline": "#9a9fb5",
};

/** Extra palette for custom session types, picked deterministically by name so a given
    custom type always gets the same color. */
const FALLBACK_LIGHT = ["#6d5a9e", "#9e5a6d", "#5a8e9e", "#8e7a3d", "#3d8e6e", "#9e6d3d"];
const FALLBACK_DARK = ["#b3a4e0", "#e0a4b3", "#a4cfe0", "#e0c98a", "#8adcb3", "#e0b58a"];

function hashIndex(name: string, length: number): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % length;
}

export function sessionTypeColor(type: SessionTypeName, isDark: boolean): string {
  const known = (isDark ? DARK_COLORS : LIGHT_COLORS)[type];
  if (known) return known;
  const palette = isDark ? FALLBACK_DARK : FALLBACK_LIGHT;
  return palette[hashIndex(type, palette.length)];
}

const SHORT_LABEL: Record<string, string> = {
  "Personal Training": "PT",
  "Group Training": "Group",
  "Remote Consult": "Remote",
  Class: "Class",
  Bodpod: "Bodpod",
  "Blueprint and Baseline": "Blueprint",
};

/** Short badge label for a type — the built-ins have a fixed abbreviation; a custom type just uses its own name. */
export function shortLabel(type: SessionTypeName): string {
  return SHORT_LABEL[type] ?? type;
}
