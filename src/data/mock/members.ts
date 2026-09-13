import type { Member } from "@/types";

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// [name, plan, coach, lastSession, balance, since, phone, email]
const RAW: [string, string, string, string, number, string, string, string][] = [
  ["Dan Whitfield", "PT 20-pack", "Cory Martin", "Sep 2, 6:00 AM", 0, "Mar 2024", "+1 403 615 5330", "dan.whitfield@gmail.com"],
  ["Sarah Chen", "PT 10-pack", "Cory Martin", "Sep 2, 10:00 AM", 0, "Jan 2025", "+1 403 774 2019", "sarah.chen@outlook.com"],
  ["Marcus Ellis", "PT 10-pack", "Cory Martin", "Sep 2, 8:30 AM", 50, "Nov 2023", "+1 403 550 8842", "m.ellis@shaw.ca"],
  ["Priya Raman", "Remote coaching", "Jess Tran", "Sep 2, 7:15 AM", 0, "Jun 2025", "+1 403 221 9075", "priya.raman@gmail.com"],
  ["Alicia Braun", "B&B pending", "Andre Reyes", "Sep 2, 1:00 PM", 0, "Sep 2026", "+1 403 908 3311", "abraun@yahoo.ca"],
  ["Rosa Delgado", "Assessment only", "Cory Martin", "Sep 2, 2:15 PM", 45, "Feb 2026", "+1 403 447 1206", "rosa.d@gmail.com"],
  ["Tom Okafor", "Class membership", "Jess Tran", "Sep 5, 9:10 AM", 0, "Aug 2025", "+1 403 662 4418", "t.okafor@gmail.com"],
  ["Owen Pratt", "Class membership", "Jess Tran", "Sep 2, 4:30 PM", 0, "Apr 2025", "+1 403 771 8890", "owen.pratt@gmail.com"],
  ["Kim Alvarez", "Group 8-pack", "Jess Tran", "Sep 2, 11:35 AM", 30, "Jul 2025", "+1 403 330 2255", "kim.alvarez@gmail.com"],
  ["Beth Nunes", "Group 8-pack", "Jess Tran", "Sep 2, 11:35 AM", 0, "May 2025", "+1 403 118 7742", "beth.nunes@gmail.com"],
  ["Rafael Diaz", "Class membership", "Andre Reyes", "Sep 1, 6:00 PM", 0, "Oct 2024", "+1 403 480 6631", "rafa.diaz@gmail.com"],
  ["Amy Cole", "Class membership", "Jess Tran", "Sep 5, 10:20 AM", 20, "Jan 2026", "+1 403 209 5514", "amy.cole@gmail.com"],
  ["Lena Ortiz", "PT 10-pack", "Andre Reyes", "Sep 3, 8:45 AM", 0, "Dec 2025", "+1 403 845 1190", "lena.ortiz@gmail.com"],
  ["Nina Park", "PT 20-pack", "Andre Reyes", "Aug 31, 6:00 AM", 0, "Feb 2025", "+1 403 512 7708", "nina.park@gmail.com"],
  ["Jon Reyes", "B&B pending", "Cory Martin", "Sep 4, 1:00 PM", 0, "Sep 2026", "+1 403 337 9021", "jon.reyes@gmail.com"],
  ["Neil Vance", "Assessment only", "Andre Reyes", "Sep 3, 2:20 PM", 45, "Mar 2026", "+1 403 776 3340", "neil.vance@gmail.com"],
];

export const MEMBERS: Member[] = RAW.map(([name, plan, coach, lastSession, balance, since, phone, email]) => ({
  id: slug(name),
  name,
  plan,
  coach,
  lastSession,
  balance,
  since,
  phone,
  email,
}));

export function memberByName(name: string): Member | undefined {
  return MEMBERS.find((m) => m.name.toLowerCase() === name.toLowerCase());
}

export function memberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** payer name -> member names they're approved to purchase for. Seed default, editable at runtime. */
export const DEFAULT_SHARED_ACCOUNTS: Record<string, string[]> = {
  "Kim Alvarez": ["Beth Nunes"],
  "Dan Whitfield": ["Nina Park", "Sarah Chen"],
  "Rafael Diaz": ["Amy Cole"],
  "Cory Martin": ["Jon Reyes"],
};
