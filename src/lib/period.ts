"use client";

import { useMemo } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface MonthHalf {
  from: string;
  to: string;
  label: string;
}

/** This month's two halves, plus which one is "current" — the same period boundary both
    billing (pre-bill at the start of a half for sessions coming up in it) and payroll (run
    once per half) use. Before the 16th the live half is 1st–15th; from the 16th on it's
    16th–end of month. */
export function useMonthHalves(): { first: MonthHalf; second: MonthHalf; current: "first" | "second" } {
  return useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const first = { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-15`, label: "1st – 15th" };
    const second = { from: `${y}-${pad(m + 1)}-16`, to: `${y}-${pad(m + 1)}-${pad(lastDay)}`, label: `16th – ${lastDay}th` };
    return { first, second, current: now.getDate() <= 15 ? "first" : ("second" as "first" | "second") };
  }, []);
}
