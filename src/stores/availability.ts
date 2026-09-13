import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoachAvailability, DayHours, DayOfWeek, TimeOffEntry } from "@/types";
import { DEFAULT_AVAILABILITY } from "@/data/mock/coaches";

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
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId];
          return {
            byCoach: {
              ...get().byCoach,
              [coachId]: { ...current, hours: { ...current.hours, [day]: { ...current.hours[day], ...patch } } },
            },
          };
        }),
      setTimeOff: (coachId, timeOff) =>
        set(() => {
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId];
          return { byCoach: { ...get().byCoach, [coachId]: { ...current, timeOff } } };
        }),
    }),
    { name: "2110-availability" },
  ),
);
