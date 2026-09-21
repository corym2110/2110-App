"use client";

import { useCallback, useEffect, useState } from "react";
import { getBusinessSettings, type BusinessSettingsDTO } from "@/server/settings";

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettingsDTO = {
  businessName: "2110 Fitness",
  address: "5824 Burbank Rd SE, Calgary, AB",
  phone: "+1 403 555 2110",
  timezone: "Mountain (MDT)",
  opens: "6:00 AM",
  closes: "8:00 PM",
  bookingIncrement: "15 minutes",
  calendarView: "Week",
  bookingFlags: { selfBook: true, waitlist: true, requireCard: false },
  currency: "CAD",
  salesTax: "GST 5%",
  cardTerminal: "Front desk terminal · connected",
  lateCancelFee: "$25.00",
  hourlyPayRate: 20,
  paymentsFlags: { emailReceipt: true, autoCharge: true, packageAlert: true, dailySummary: false },
  notifyFlags: { reminder: true, cancelNotice: true, waitlistOpen: true, birthday: false, marketing: false },
  reminderTiming: "24 hours before",
  packageWarning: "2 sessions left",
  dailySummaryTo: "cory@2110fitness.com",
};

export function useBusinessSettings(): { settings: BusinessSettingsDTO | null; refetch: () => void } {
  const [settings, setSettings] = useState<BusinessSettingsDTO | null>(null);

  const refetch = useCallback(() => {
    getBusinessSettings().then(setSettings);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { settings, refetch };
}
