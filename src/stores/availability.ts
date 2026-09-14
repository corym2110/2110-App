import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoachAvailability, DayOfWeek, Shift, TimeOffEntry } from "@/types";
import { DEFAULT_AVAILABILITY } from "@/data/mock/coaches";

/** Used for any coach without a seeded entry (e.g. one added after the mock defaults) — all days off, no time off. */
export const EMPTY_AVAILABILITY: CoachAvailability = {
  hours: {
    Mon: { on: false, shifts: [] },
    Tue: { on: false, shifts: [] },
    Wed: { on: false, shifts: [] },
    Thu: { on: false, shifts: [] },
    Fri: { on: false, shifts: [] },
    Sat: { on: false, shifts: [] },
    Sun: { on: false, shifts: [] },
  },
  timeOff: [],
};

const DEFAULT_NEW_SHIFT: Shift = { start: 540, end: 1020 }; // 9:00 AM – 5:00 PM

interface AvailabilityState {
  byCoach: Record<string, CoachAvailability>;
  toggleDayOn: (coachId: string, day: DayOfWeek) => void;
  addShift: (coachId: string, day: DayOfWeek) => void;
  updateShift: (coachId: string, day: DayOfWeek, index: number, patch: Partial<Shift>) => void;
  removeShift: (coachId: string, day: DayOfWeek, index: number) => void;
  setTimeOff: (coachId: string, timeOff: TimeOffEntry[]) => void;
}

export const useAvailabilityStore = create<AvailabilityState>()(
  persist(
    (set, get) => ({
      byCoach: DEFAULT_AVAILABILITY,
      toggleDayOn: (coachId, day) =>
        set(() => {
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId] ?? EMPTY_AVAILABILITY;
          const h = current.hours[day];
          const on = !h.on;
          const shifts = on && h.shifts.length === 0 ? [DEFAULT_NEW_SHIFT] : h.shifts;
          return { byCoach: { ...get().byCoach, [coachId]: { ...current, hours: { ...current.hours, [day]: { on, shifts } } } } };
        }),
      addShift: (coachId, day) =>
        set(() => {
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId] ?? EMPTY_AVAILABILITY;
          const h = current.hours[day];
          const last = h.shifts[h.shifts.length - 1];
          const start = last ? Math.min(1380, last.end + 60) : DEFAULT_NEW_SHIFT.start;
          const end = Math.min(1440, start + 240);
          return {
            byCoach: {
              ...get().byCoach,
              [coachId]: { ...current, hours: { ...current.hours, [day]: { on: true, shifts: [...h.shifts, { start, end }] } } },
            },
          };
        }),
      updateShift: (coachId, day, index, patch) =>
        set(() => {
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId] ?? EMPTY_AVAILABILITY;
          const h = current.hours[day];
          const shifts = h.shifts.map((s, i) => (i === index ? { ...s, ...patch } : s));
          return { byCoach: { ...get().byCoach, [coachId]: { ...current, hours: { ...current.hours, [day]: { ...h, shifts } } } } };
        }),
      removeShift: (coachId, day, index) =>
        set(() => {
          const current = get().byCoach[coachId] ?? DEFAULT_AVAILABILITY[coachId] ?? EMPTY_AVAILABILITY;
          const h = current.hours[day];
          const shifts = h.shifts.filter((_, i) => i !== index);
          return {
            byCoach: {
              ...get().byCoach,
              [coachId]: { ...current, hours: { ...current.hours, [day]: { on: shifts.length > 0, shifts } } },
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
