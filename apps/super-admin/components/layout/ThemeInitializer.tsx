"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

export function ThemeInitializer() {
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    const cleanup = initTheme();
    return cleanup;
  }, [initTheme]);

  return null;
}
