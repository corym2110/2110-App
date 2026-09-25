export const COACH_ROLES = ["Owner", "GM", "Admin", "Coach"] as const;
export type CoachRole = (typeof COACH_ROLES)[number];

/** Payroll and Reports are Owner/GM-only — deliberately narrower than `isAdmin`, which Admin
    (backend/config access) still has for everything else (Settings, staff management). */
export function canViewFinancials(role: string): boolean {
  return role === "Owner" || role === "GM";
}
