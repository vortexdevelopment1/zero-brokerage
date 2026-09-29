"use client";

import { useThemeStore } from "@/store/themeStore";

export function useChartTheme() {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const isDark = resolvedTheme === "dark";

  return {
    isDark,
    gridColor: isDark ? "#1F2937" : "#E5E7EB",
    tickColor: isDark ? "#9CA3AF" : "#6B7280",
    yAxisColor: isDark ? "#D1D5DB" : "#374151",
    tooltipBg: isDark ? "#111827" : "#FFFFFF",
    tooltipBorder: isDark ? "#374151" : "#E5E7EB",
    tooltipText: isDark ? "#F8F9FB" : "#111827",
    cursorColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
  };
}
