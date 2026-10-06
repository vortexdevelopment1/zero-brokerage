/**
 * Status Badge Component (Step 9A)
 *
 * Enforces:
 * 1. Accessible status presentation: Never conveys status by color alone.
 * 2. Visual clarity with tone borders and icons.
 */

import React from "react";
import { View } from "react-native";
import { Text } from "@/components/primitives";
import type { StatusPresentation } from "../utils/status-mappings";

interface StatusBadgeProps {
  readonly presentation: StatusPresentation;
  readonly size?: "small" | "medium";
}

export function StatusBadge({
  presentation,
  size = "medium",
}: StatusBadgeProps) {
  const { label, tone, icon, accessibilityLabel } = presentation;

  const toneStyles: Record<
    string,
    { bg: string; border: string; textTone: "success" | "warning" | "error" | "brand" | "secondary" }
  > = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200 dark:border-emerald-800",
      textTone: "success",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-200 dark:border-amber-800",
      textTone: "warning",
    },
    error: {
      bg: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-rose-200 dark:border-rose-800",
      textTone: "error",
    },
    info: {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      border: "border-sky-200 dark:border-sky-800",
      textTone: "brand",
    },
    neutral: {
      bg: "bg-slate-100 dark:bg-slate-800/50",
      border: "border-slate-300 dark:border-slate-700",
      textTone: "secondary",
    },
  };

  const current = toneStyles[tone] || toneStyles.neutral;
  const isSmall = size === "small";

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      className={`flex-row items-center rounded-full border ${current.bg} ${current.border} ${
        isSmall ? "px-2 py-0.5 space-x-1" : "px-3 py-1 space-x-1.5"
      }`}
    >
      <Text
        variant="caption"
        className={isSmall ? "text-[10px]" : "text-xs"}
      >
        {icon}
      </Text>
      <Text
        variant="caption"
        tone={current.textTone}
        weight="bold"
        className={`tracking-wider uppercase ${isSmall ? "text-[9px]" : "text-[10px]"}`}
      >
        {label}
      </Text>
    </View>
  );
}
