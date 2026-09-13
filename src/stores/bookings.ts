import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoachId, DayOfWeek, SessionTypeName } from "@/types";

/** A one-off booking made through the "New session" dialog. */
export interface OneOffBooking {
  id: string;
  iso: string;
  start: number;
  duration: number;
  type: SessionTypeName;
  coach: CoachId;
  name: string; // client name, or "" for a generic Group Training slot
  roster?: string[];
}

/** A recurring series created through the booking dialog's "repeat weekly" option. */
export interface RecurringSeries {
  id: string;
  client: string;
  type: SessionTypeName;
  coach: CoachId;
  duration: number;
  days: Partial<Record<DayOfWeek, number>>; // day -> start minutes
  fromIso: string;
  toIso?: string;
}

/** Where a specific occurrence (recurring row or booking) was dragged to. Keyed by its origin. */
export interface MoveRecord {
  iso: string;
  start: number;
  coach?: CoachId;
}

interface BookingsState {
  bookings: OneOffBooking[];
  series: RecurringSeries[];
  moves: Record<string, MoveRecord>;
  /** Occurrence keys (see Occurrence.key) that have been cancelled — hidden from occurrencesForDate. */
  cancellations: Record<string, true>;
  addBooking: (b: Omit<OneOffBooking, "id">) => void;
  addSeries: (s: Omit<RecurringSeries, "id">) => void;
  move: (originKey: string, to: MoveRecord) => void;
  updateBooking: (id: string, patch: Partial<Omit<OneOffBooking, "id">>) => void;
  /** Cancels one occurrence: deletes it outright if it's a one-off booking, otherwise hides just this instance of its series/recurring row. */
  cancelOccurrence: (sourceId: string, key: string) => void;
}

export const useBookingsStore = create<BookingsState>()(
  persist(
    (set, get) => ({
      bookings: [],
      series: [],
      moves: {},
      cancellations: {},
      addBooking: (b) => set({ bookings: [...get().bookings, { ...b, id: `bk-${Date.now()}-${Math.round(Math.random() * 1e4)}` }] }),
      addSeries: (s) => set({ series: [...get().series, { ...s, id: `sr-${Date.now()}-${Math.round(Math.random() * 1e4)}` }] }),
      move: (originKey, to) => set({ moves: { ...get().moves, [originKey]: to } }),
      updateBooking: (id, patch) => set({ bookings: get().bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) }),
      cancelOccurrence: (sourceId, key) => {
        if (get().bookings.some((b) => b.id === sourceId)) {
          set({ bookings: get().bookings.filter((b) => b.id !== sourceId) });
        } else {
          set({ cancellations: { ...get().cancellations, [key]: true } });
        }
      },
    }),
    { name: "2110-bookings" },
  ),
);
