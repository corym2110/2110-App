import type { RecurringRow } from "@/types";

// Ported verbatim from "2110 Schedule.dc.html"'s recurring weekly template
// (`base` in Component.renderVals). dow: 0=Mon..6=Sun. start/duration in minutes.
type Raw = [number, number, number, string, RecurringRow["type"], RecurringRow["coach"], string[]?];

const RAW: Raw[] = [];

export const RECURRING_SCHEDULE: RecurringRow[] = RAW.map(([dow, start, duration, name, type, coach, roster], i) => ({
  id: `rec-${i}`,
  dow,
  start,
  duration,
  name,
  type,
  coach,
  roster,
}));
