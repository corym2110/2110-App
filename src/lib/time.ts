export const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DOW_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Minutes-from-midnight -> "6:00 AM" */
export function clock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "6:00 AM" -> minutes-from-midnight */
export function parseClock(label: string): number {
  const match = label.match(/(\d+):(\d+)\s(AM|PM)/);
  if (!match) return 0;
  let h = Number(match[1]) % 12;
  if (match[3] === "PM") h += 12;
  return h * 60 + Number(match[2]);
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

export function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 0=Mon .. 6=Sun (JS getDay() is 0=Sun) */
export function dowIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function mondayOf(date: Date): Date {
  return addDays(date, -dowIndex(date));
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function formatDateShort(date: Date): string {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateLong(date: Date): string {
  return `${DOW_FULL[dowIndex(date)]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateTime(date: Date): string {
  let h = date.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateShort(date)} ${String(h).padStart(2, "0")}:${m}${ampm}`;
}

export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function moneyRounded(n: number): string {
  return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Attendance record key: `${iso}-${startMinutes}-${coachId}-${memberName}` (memberName "" for a whole group slot). */
export function slotKey(iso: string, start: number, coachId: string, name = ""): string {
  return `${iso}-${start}-${coachId}-${name}`;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
