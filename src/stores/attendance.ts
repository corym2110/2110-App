import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AttendanceStatus, FeeDecision } from "@/types";

/** Slot key: `${iso}-${startMinutes}-${coachId}-${memberName}` (memberName "" for a whole group slot). */
export function slotKey(iso: string, start: number, coachId: string, name = ""): string {
  return `${iso}-${start}-${coachId}-${name}`;
}

interface AttendanceState {
  statuses: Record<string, AttendanceStatus>;
  fees: Record<string, FeeDecision>;
  setStatus: (key: string, status: AttendanceStatus | null) => void;
  setFee: (key: string, decision: FeeDecision) => void;
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      statuses: {},
      fees: {},
      setStatus: (key, status) =>
        set(() => {
          const next = { ...get().statuses };
          if (status === null) delete next[key];
          else next[key] = status;
          return { statuses: next };
        }),
      setFee: (key, decision) => set({ fees: { ...get().fees, [key]: decision } }),
    }),
    { name: "2110-attendance-fees" },
  ),
);
