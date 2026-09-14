import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoachAvailability, DayHours, DayOfWeek, TimeOffEntry } from "@/types";
import { DEFAULT_AVAILABILITY } from "@/data/mock/coaches";

/** Used for any coach without a seeded entry (e.g. one added after the mock defaults) — all days off, no time off. */
export const EMPTY_AVAILABILITY: CoachAvailability = {
  hours: {
    Mon: { on: false, start: 540, end: 1020 },
    Tue: { on: false, start: 540, end: 1020 },
    Wed: { on: false, start: 540, end: 1020 },
    Thu: { on: false, start: 540, end: 1020 },
    Fri: { on: false, start: 540, end: 1020 },
    Sat: { on: false, start: 540, end: 1020 },
    Sun: { on: false, start: 540, end: 1020 },
  },
  timeOff: [],
};

interface AvailabilityState {
  byCoach: Record<string, CoachAvailability>;
  setDayHours: (coachId: string, day: DayOfWeek, patch: Partial<DayHours>) => void;
  setTimeOff: (coachId: string, timeOff: TimeOffEntry[]) => void;
}

export const useAvailabilityStore = create<AvailabilityState>()(
  persist(
    (set, get) => ({
      byCoach: DEFAULT_AVAILABILITY,
      setDayHours: (coachId, day, patch) =>
        set(() => {
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId] ?? EMPTY_AVAILABILITY;
          return {
            byCoach: {
              ...get().byCoach,
              [coachId]: { ...current, hours: { ...current.hours, [day]: { ...current.hours[day], ...patch } } },
            },
          };
        }),
      setTimeOff: (coachId, timeOff) =>
        set(() => {
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId] ?? EMPTY_AVAILABILITY;
          return { byCoach: { ...get().byCoach, [coachId]: { ...current, timeOff } } };
        }),
    }),
    { name: "2110-availability" },
  ),
);
