"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";

export function ThemeAttribute() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return null;
}
