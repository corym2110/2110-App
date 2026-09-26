"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { parseInput } from "@/lib/validate";
import { BusinessSettingsDTOSchema, type BusinessSettingsDTO } from "@/lib/schemas";

export type { BusinessSettingsDTO };

const SINGLETON_ID = "singleton";

export async function getBusinessSettings(): Promise<BusinessSettingsDTO> {
  const row = await db.businessSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });
  return {
    businessName: row.businessName,
    address: row.address,
    phone: row.phone,
    timezone: row.timezone,
    opens: row.opens,
    closes: row.closes,
    bookingIncrement: row.bookingIncrement,
    calendarView: row.calendarView,
    bookingFlags: row.bookingFlags as BusinessSettingsDTO["bookingFlags"],
    currency: row.currency,
    salesTax: row.salesTax,
    hourlyPayRate: row.hourlyPayRate,
    paymentsFlags: row.paymentsFlags as BusinessSettingsDTO["paymentsFlags"],
    notifyFlags: row.notifyFlags as BusinessSettingsDTO["notifyFlags"],
    reminderTiming: row.reminderTiming,
    packageWarning: row.packageWarning,
    dailySummaryTo: row.dailySummaryTo,
  };
}

/** Admin-only: same reasoning as getPayrollForPeriod — the Settings page redirects non-admins,
    but that's a UI convenience, not a security boundary for this Server Action itself. */
export async function saveBusinessSettings(input: BusinessSettingsDTO): Promise<void> {
  const requester = await getCurrentCoach();
  if (!requester?.isAdmin) throw new Error("Only an admin can change business settings.");

  const parsed = parseInput(BusinessSettingsDTOSchema, input);
  const data = { ...parsed, bookingFlags: parsed.bookingFlags as object, paymentsFlags: parsed.paymentsFlags as object, notifyFlags: parsed.notifyFlags as object };
  await db.businessSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  revalidatePath("/settings");
}
