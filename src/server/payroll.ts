"use server";

import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { canViewFinancials } from "@/lib/roles";
import { getOccurrencesForRange } from "./schedule";
import { getBusinessSettings } from "./settings";
import { sessionTypeByName } from "@/data/mock/sessionTypes";
import { matchProduct } from "@/lib/matchProduct";
import { getProducts } from "./products";
import { parseInput, IsoDateSchema } from "@/lib/validate";
import type { SessionTypeName } from "@/types";

/** Personal Training / Group Training / Remote Consult / Blueprint and Baseline pay a
    per-coach commission percentage; everything else (Bodpod, Class, and any custom type an
    admin has added) pays the flat hourly rate — see the payroll plan for why the split lands
    here rather than being config-driven. */
const COMMISSION_TYPES: SessionTypeName[] = ["Personal Training", "Group Training", "Remote Consult", "Blueprint and Baseline"];

export interface PayrollLineItem {
  type: SessionTypeName;
  basis: "commission" | "hourly";
  count: number;
  hours: number;
  subtotal: number;
}

export interface CoachPayrollRow {
  coachId: string;
  coachName: string;
  commissionRate: number;
  commission: { count: number; subtotal: number };
  hourly: { count: number; hours: number; subtotal: number };
  total: number;
  items: PayrollLineItem[];
}

/** Owner/GM-only — deliberately narrower than `isAdmin` (Admin has settings/staff access but not
    financial visibility). The settings page already redirects non-Owner/GM coaches away, but
    that's a UI convenience, not a security boundary — this is a real Server Action, callable
    directly regardless of which page invoked it, so the check has to live here too. */
export async function getPayrollForPeriod(periodFrom: string, periodTo: string): Promise<CoachPayrollRow[]> {
  const requester = await getCurrentCoach();
  if (!requester || !canViewFinancials(requester.role)) throw new Error("Only an Owner or GM can view payroll.");
  const validFrom = parseInput(IsoDateSchema, periodFrom);
  const validTo = parseInput(IsoDateSchema, periodTo);

  const [byIso, coaches, settings, products] = await Promise.all([
    getOccurrencesForRange(validFrom, validTo),
    db.coach.findMany({ orderBy: { name: "asc" } }),
    getBusinessSettings(),
    getProducts(),
  ]);

  /** Real price for this session — same catalog-first resolution as billing.ts's priceFor,
      duplicated here since that one's a private closure over billing.ts's own coach map. */
  function priceFor(type: SessionTypeName, teachingCoachId: string): number {
    return matchProduct(type, teachingCoachId, products)?.price ?? sessionTypeByName(type).price;
  }

  // coachId -> type -> accumulator
  const byCoach = new Map<string, Map<string, PayrollLineItem>>();

  for (const occs of Object.values(byIso)) {
    for (const occ of occs) {
      const basis: "commission" | "hourly" = COMMISSION_TYPES.includes(occ.type) ? "commission" : "hourly";
      let items = byCoach.get(occ.coach);
      if (!items) {
        items = new Map();
        byCoach.set(occ.coach, items);
      }
      let item = items.get(occ.type);
      if (!item) {
        item = { type: occ.type, basis, count: 0, hours: 0, subtotal: 0 };
        items.set(occ.type, item);
      }
      item.count += 1;
      item.hours += occ.duration / 60;
      if (basis === "commission") {
        const coach = coaches.find((c) => c.id === occ.coach);
        item.subtotal += priceFor(occ.type, occ.coach) * (coach?.commissionRate ?? 0);
      } else {
        item.subtotal += (occ.duration / 60) * settings.hourlyPayRate;
      }
    }
  }

  return coaches
    .map((coach): CoachPayrollRow => {
      const items = [...(byCoach.get(coach.id)?.values() ?? [])];
      const commission = items.filter((i) => i.basis === "commission").reduce(
        (a, i) => ({ count: a.count + i.count, subtotal: a.subtotal + i.subtotal }),
        { count: 0, subtotal: 0 },
      );
      const hourly = items.filter((i) => i.basis === "hourly").reduce(
        (a, i) => ({ count: a.count + i.count, hours: a.hours + i.hours, subtotal: a.subtotal + i.subtotal }),
        { count: 0, hours: 0, subtotal: 0 },
      );
      return {
        coachId: coach.id,
        coachName: coach.name,
        commissionRate: coach.commissionRate,
        commission,
        hourly,
        total: commission.subtotal + hourly.subtotal,
        items,
      };
    })
    .filter((row) => row.items.length > 0)
    .sort((a, b) => b.total - a.total);
}
