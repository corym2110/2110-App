import type { ReactNode } from "react";
import { create } from "zustand";

/** Lets each screen supply its own primary header button (New session, Export, Add member...). */
interface HeaderActionState {
  node: ReactNode | null;
  set: (node: ReactNode | null) => void;
}

export const useHeaderActionStore = create<HeaderActionState>()((set) => ({
  node: null,
  set: (node) => set({ node }),
}));
