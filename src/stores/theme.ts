import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeName } from "@/types";

interface ThemeState {
  theme: ThemeName;
  toggle: () => void;
  set: (t: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      set: (t) => set({ theme: t }),
    }),
    { name: "2110-theme" },
  ),
);
