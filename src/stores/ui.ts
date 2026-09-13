import { create } from "zustand";

/** Shared, non-persisted shell UI state (sidebar collapse). */
interface UIState {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  collapsed: false,
  toggleCollapsed: () => set({ collapsed: !get().collapsed }),
}));
