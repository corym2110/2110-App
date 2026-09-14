import type { Coach, CoachAvailability, DayOfWeek } from "@/types";

export const COACHES: Coach[] = [
  { id: "CM", name: "Cory Martin", initials: "CM", role: "Coach", email: "cory@2110fitness.com", active: true },
];

export function coachName(id: string): string {
  return COACHES.find((c) => c.id === id)?.name ?? id;
}

const hours = (on: boolean, start: number, end: number) => ({ on, shifts: on ? [{ start, end }] : [] });

export const DAYS_OF_WEEK: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEFAULT_AVAILABILITY: Record<string, CoachAvailability> = {
  CM: {
    hours: {
      Mon: hours(true, 360, 1140),
      Tue: hours(true, 360, 1140),
      Wed: hours(true, 360, 1140),
      Thu: hours(true, 360, 1140),
      Fri: hours(true, 360, 900),
      Sat: hours(false, 480, 720),
      Sun: hours(false, 480, 720),
    },
    timeOff: [
      { from: "2026-09-21", to: "2026-09-25", reason: "Vacation", type: "Full days" },
      { from: "2026-10-09", to: "2026-10-09", reason: "Certification course", type: "Full days" },
    ],
  },
};
