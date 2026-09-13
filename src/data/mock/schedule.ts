import type { RecurringRow } from "@/types";

// Ported verbatim from "2110 Schedule.dc.html"'s recurring weekly template
// (`base` in Component.renderVals). dow: 0=Mon..6=Sun. start/duration in minutes.
type Raw = [number, number, number, string, RecurringRow["type"], RecurringRow["coach"], string[]?];

const RAW: Raw[] = [
  [0, 6 * 60, 60, "Dan Whitfield", "Personal Training", "CM"],
  [0, 6 * 60, 60, "Nina Park", "Personal Training", "AR"],
  [0, 8 * 60 + 30, 60, "Marcus Ellis", "Personal Training", "CM"],
  [0, 10 * 60, 60, "Sarah Chen", "Personal Training", "CM"],
  [0, 11 * 60 + 30, 60, "", "Group Training", "JT", ["Dan Whitfield", "Owen Pratt", "Kim Alvarez", "Beth Nunes"]],
  [0, 14 * 60 + 15, 30, "Rosa Delgado", "Bodpod", "AR"],
  [0, 16 * 60 + 30, 60, "Conditioning", "Class", "JT", ["Owen Pratt", "Kim Alvarez", "Rafael Diaz", "Beth Nunes", "Tom Okafor", "Amy Cole"]],
  [1, 7 * 60 + 15, 15, "Priya Raman", "Remote Consult", "AR"],
  [1, 10 * 60, 60, "Sarah Chen", "Personal Training", "CM"],
  [1, 13 * 60, 90, "Alicia Braun", "Blueprint and Baseline", "AR"],
  [1, 16 * 60 + 30, 60, "Conditioning", "Class", "JT", ["Owen Pratt", "Rafael Diaz", "Beth Nunes", "Tom Okafor", "Amy Cole"]],
  [1, 18 * 60, 60, "", "Group Training", "JT", ["Dan Whitfield", "Rafael Diaz", "Beth Nunes"]],
  [2, 6 * 60, 60, "Dan Whitfield", "Personal Training", "CM"],
  [2, 7 * 60 + 15, 15, "Priya Raman", "Remote Consult", "AR"],
  [2, 8 * 60 + 30, 60, "Marcus Ellis", "Personal Training", "CM"],
  [2, 10 * 60, 60, "Sarah Chen", "Personal Training", "CM"],
  [2, 10 * 60, 60, "Rafael Diaz", "Personal Training", "AR"],
  [2, 6 * 60, 60, "2110 Fitness Class", "Class", "JT", ["Owen Pratt", "Kim Alvarez", "Amy Cole"]],
  [2, 11 * 60 + 30, 60, "", "Group Training", "JT", ["Dan Whitfield", "Owen Pratt", "Kim Alvarez", "Beth Nunes"]],
  [2, 13 * 60, 90, "Alicia Braun", "Blueprint and Baseline", "AR"],
  [2, 14 * 60 + 45, 30, "Rosa Delgado", "Bodpod", "AR"],
  [2, 16 * 60 + 30, 60, "Conditioning", "Class", "JT", ["Owen Pratt", "Kim Alvarez", "Rafael Diaz", "Beth Nunes", "Tom Okafor", "Amy Cole"]],
  [3, 8 * 60 + 45, 60, "Lena Ortiz", "Personal Training", "CM"],
  [3, 14 * 60 + 15, 30, "Neil Vance", "Bodpod", "AR"],
  [3, 16 * 60 + 30, 60, "Conditioning", "Class", "JT", ["Kim Alvarez", "Rafael Diaz", "Tom Okafor", "Amy Cole"]],
  [3, 18 * 60, 60, "", "Group Training", "JT", ["Dan Whitfield", "Rafael Diaz", "Beth Nunes"]],
  [4, 6 * 60, 60, "Dan Whitfield", "Personal Training", "CM"],
  [4, 10 * 60, 60, "Sarah Chen", "Personal Training", "CM"],
  [4, 11 * 60 + 30, 60, "", "Group Training", "JT", ["Dan Whitfield", "Owen Pratt", "Kim Alvarez", "Beth Nunes", "Tom Okafor", "Rafael Diaz"]],
  [4, 13 * 60, 90, "Jon Reyes", "Blueprint and Baseline", "AR"],
  [4, 16 * 60 + 30, 60, "Conditioning", "Class", "JT", ["Owen Pratt", "Rafael Diaz", "Beth Nunes", "Tom Okafor", "Amy Cole"]],
  [5, 8 * 60, 60, "", "Group Training", "JT", ["Owen Pratt", "Beth Nunes", "Amy Cole", "Kim Alvarez", "Rafael Diaz"]],
  [5, 9 * 60 + 15, 60, "Tom Okafor", "Personal Training", "CM"],
  [5, 10 * 60 + 30, 30, "Amy Cole", "Bodpod", "AR"],
  [6, 9 * 60, 15, "Priya Raman", "Remote Consult", "AR"],
  [6, 10 * 60, 60, "Recovery class", "Class", "JT", ["Priya Raman", "Amy Cole", "Beth Nunes", "Dan Whitfield"]],
];

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
