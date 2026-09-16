export type ReportRangeKey = "This week" | "This month" | "Last 90 days" | "Year to date";

export function rangeStart(range: ReportRangeKey, now: Date): Date {
  const d = new Date(now);
  if (range === "This week") {
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - dow);
  } else if (range === "This month") {
    d.setDate(1);
  } else if (range === "Last 90 days") {
    d.setDate(d.getDate() - 90);
  } else {
    d.setMonth(0, 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}
