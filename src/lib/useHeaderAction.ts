import { useEffect } from "react";
import type { ReactNode } from "react";
import { useHeaderActionStore } from "@/stores/headerAction";

/** Registers this screen's primary header button; clears it on unmount. */
export function useHeaderAction(node: ReactNode) {
  const set = useHeaderActionStore((s) => s.set);
  useEffect(() => {
    set(node);
    return () => set(null);
  });
}
