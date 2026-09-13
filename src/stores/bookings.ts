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
  addBooking: (b: Omit<OneOffBooking, "id">) => void;
  addSeries: (s: Omit<RecurringSeries, "id">) => void;
  move: (originKey: string, to: MoveRecord) => void;
}

export const useBookingsStore = create<BookingsState>()(
  persist(
    (set, get) => ({
      bookings: [],
      series: [],
      moves: {},
      addBooking: (b) => set({ bookings: [...get().bookings, { ...b, id: `bk-${Date.now()}-${Math.round(Math.random() * 1e4)}` }] }),
      addSeries: (s) => set({ series: [...get().series, { ...s, id: `sr-${Date.now()}-${Math.round(Math.random() * 1e4)}` }] }),
      move: (originKey, to) => set({ moves: { ...get().moves, [originKey]: to } }),
    }),
    { name: "2110-bookings" },
  ),
);
