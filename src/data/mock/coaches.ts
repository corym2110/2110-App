import type { Coach, CoachAvailability, DayOfWeek } from "@/types";

export const COACHES: Coach[] = [
  { id: "CM", name: "Cory Martin", initials: "CM", role: "Facility Supervisor", email: "cory@2110fitness.com", active: true },
  { id: "JT", name: "Jess Tran", initials: "JT", role: "Coach", email: "jess@2110fitness.com", active: true },
  { id: "AR", name: "Andre Reyes", initials: "AR", role: "Coach", email: "andre@2110fitness.com", active: true },
];

export function coachName(id: string): string {
  return COACHES.find((c) => c.id === id)?.name ?? id;
}

const hours = (on: boolean, start: number, end: number) => ({ on, start, end });

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
  JT: {
    hours: {
      Mon: hours(true, 360, 1200),
      Tue: hours(true, 360, 1200),
      Wed: hours(true, 360, 1200),
      Thu: hours(true, 360, 1200),
      Fri: hours(true, 420, 1080),
      Sat: hours(true, 480, 780),
      Sun: hours(true, 540, 720),
    },
    timeOff: [],
  },
  AR: {
    hours: {
      Mon: hours(true, 420, 1020),
      Tue: hours(true, 420, 1020),
      Wed: hours(true, 420, 1020),
      Thu: hours(true, 420, 1020),
      Fri: hours(true, 420, 960),
      Sat: hours(true, 480, 720),
      Sun: hours(true, 480, 720),
    },
    timeOff: [],
  },
};
