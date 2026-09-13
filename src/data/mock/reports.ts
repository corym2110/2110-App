export type ReportRange = "This week" | "This month" | "Last 90 days" | "Year to date";

export interface ReportSet {
  label: string;
  bars: [string, number][];
  kpis: [string, number | string, string, "good" | null][];
  sessions: number;
}

// Ported from "2110 Reports.dc.html"'s `sets`.
export const REPORT_SETS: Record<ReportRange, ReportSet> = {
  "This week": {
    label: "Week of August 31 – September 6, 2026",
    bars: [["Mon", 1180], ["Tue", 940], ["Wed", 1320], ["Thu", 860], ["Fri", 1090], ["Sat", 620], ["Sun", 310]],
    kpis: [
      ["Revenue", 6320, "+8.4% vs last week", "good"],
      ["Sessions", 118, "+6 vs last week", "good"],
      ["Utilization", "84%", "3 open slots", null],
      ["New members", 4, "1 intake pending", null],
    ],
    sessions: 118,
  },
  "This month": {
    label: "September 2026 · month to date",
    bars: [["Wk 1", 6320], ["Wk 2", 5980], ["Wk 3", 6410], ["Wk 4", 3120]],
    kpis: [
      ["Revenue", 21830, "+11.2% vs August", "good"],
      ["Sessions", 402, "+34 vs August", "good"],
      ["Utilization", "86%", "of coached hours", null],
      ["New members", 12, "3 intakes booked", null],
    ],
    sessions: 402,
  },
  "Last 90 days": {
    label: "June 6 – September 3, 2026",
    bars: [["Jun", 19240], ["Jul", 20110], ["Aug", 19660], ["Sep", 21830]],
    kpis: [
      ["Revenue", 80840, "+6.1% vs prior 90", "good"],
      ["Sessions", 1284, "+72 vs prior 90", "good"],
      ["Utilization", "82%", "of coached hours", null],
      ["New members", 31, "8 lapsed", null],
    ],
    sessions: 1284,
  },
  "Year to date": {
    label: "January 1 – September 3, 2026",
    bars: [["Q1", 54800], ["Q2", 61240], ["Q3", 58910]],
    kpis: [
      ["Revenue", 174950, "+14.8% vs 2025", "good"],
      ["Sessions", 3612, "+318 vs 2025", "good"],
      ["Utilization", "81%", "of coached hours", null],
      ["New members", 96, "148 active", null],
    ],
    sessions: 3612,
  },
};

export const SESSION_TYPE_SHARE: [string, number][] = [
  ["Personal Training", 46],
  ["Class", 22],
  ["Group Training", 16],
  ["Remote Consult", 8],
  ["Bodpod", 5],
  ["Blueprint and Baseline", 3],
];

export const COACH_SHARE: [string, string, number][] = [["Cory Martin", "CM", 1]];

export const COACH_UTIL: Record<string, number> = { CM: 91 };

export const RETENTION: [string, string, "good" | "bad" | "warn" | "text"][] = [
  ["Attendance rate", "93%", "good"],
  ["Cancellations", "11", "text"],
  ["No-shows", "3", "bad"],
  ["Packages expiring", "6", "warn"],
  ["Lapsed members", "5", "bad"],
  ["Repeat rate", "88%", "good"],
];

export const FOLLOW_UP: [string, string, "bad" | "warn"][] = [];

export const TOP_SELLERS: [string, number, number][] = [
  ["PT 10-pack", 14, 6300],
  ["Class membership · monthly", 22, 2838],
  ["PT 20-pack", 3, 2550],
  ["Group 8-pack", 8, 1920],
  ["Class drop-in", 41, 820],
  ["Protein shake", 96, 624],
];
