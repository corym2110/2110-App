import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationsState {
  read: Record<string, boolean>;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      read: {},
      markRead: (id) => set({ read: { ...get().read, [id]: true } }),
      markAllRead: (ids) => set({ read: Object.fromEntries(ids.map((id) => [id, true])) }),
    }),
    { name: "2110-notifications-read" },
  ),
);
