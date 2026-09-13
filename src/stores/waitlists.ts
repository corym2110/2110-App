import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Slot key: `${iso}|${startMinutes}|${coachId}|${type}` */
export function waitlistKey(iso: string, start: number, coachId: string, type: string): string {
  return `${iso}|${start}|${coachId}|${type}`;
}

interface WaitlistState {
  waitlists: Record<string, string[]>;
  classAdds: Record<string, string[]>;
  addToWaitlist: (key: string, name: string) => void;
  removeFromWaitlist: (key: string, name: string) => void;
  promoteFromWaitlist: (key: string, name: string) => void;
  addToClass: (key: string, name: string) => void;
}

export const useWaitlistStore = create<WaitlistState>()(
  persist(
    (set, get) => ({
      waitlists: {},
      classAdds: {},
      addToWaitlist: (key, name) =>
        set(() => {
          const list = get().waitlists[key] ?? [];
          if (list.includes(name)) return {};
          return { waitlists: { ...get().waitlists, [key]: [...list, name] } };
        }),
      removeFromWaitlist: (key, name) =>
        set(() => ({
          waitlists: { ...get().waitlists, [key]: (get().waitlists[key] ?? []).filter((n) => n !== name) },
        })),
      promoteFromWaitlist: (key, name) => {
        get().removeFromWaitlist(key, name);
        get().addToClass(key, name);
      },
      addToClass: (key, name) =>
        set(() => {
          const list = get().classAdds[key] ?? [];
          if (list.includes(name)) return {};
          return { classAdds: { ...get().classAdds, [key]: [...list, name] } };
        }),
    }),
    { name: "2110-waitlists-adds" },
  ),
);
