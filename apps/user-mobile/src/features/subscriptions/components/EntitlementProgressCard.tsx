/**
 * Entitlement Usage & Progress Presentation Component (Step 9A)
 *
 * Strict Compliance:
 * 1. Renders ONLY backend-provided values.
 * 2. NO client-side formula calculations or quota derivations.
 * 3. Handles unlimited, finite limits, and usage counters safely.
 * 4. High accessibility support with descriptive labels.
 */

import React from "react";
import { View } from "react-native";
import { Card, Stack, Text } from "@/components/primitives";
import type { EntitlementItem } from "../types/subscription.types";

interface EntitlementProgressCardProps {
  readonly item: EntitlementItem;
}

export function EntitlementProgressCard({ item }: EntitlementProgressCardProps) {
  const {
    featureKey,
    label,
    description,
    usedCount,
    limitCount,
    remainingQuota,
    unlimited,
    isAllowed,
    denialReason,
  } = item;

  // Render backend-provided quota numbers without client calculation
  const hasCounts = typeof usedCount === "number" && typeof limitCount === "number";
  const percentage =
    hasCounts && limitCount > 0
      ? Math.min(Math.max((usedCount / limitCount) * 100, 0), 100)
      : 0;

  return (
    <Card
      variant="outlined"
      padding="medium"
      radius="medium"
      className="border-default-border bg-surface mb-3"
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${
        unlimited
          ? "Unlimited access"
          : hasCounts
            ? `${usedCount} of ${limitCount} used`
            : isAllowed
              ? "Access available"
              : "Access limited"
      }`}
    >
      <Stack spacing={2}>
        <View className="flex-row items-center justify-between">
          <Text variant="bodySmall" tone="primary" weight="bold">
            {label}
          </Text>
          {unlimited ? (
            <View className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <Text
                variant="caption"
                tone="success"
                weight="bold"
                className="text-[10px] uppercase"
              >
                UNLIMITED
              </Text>
            </View>
          ) : hasCounts ? (
            <Text variant="caption" tone="secondary" weight="semibold">
              {usedCount} / {limitCount}
            </Text>
          ) : typeof remainingQuota === "number" ? (
            <Text variant="caption" tone="secondary" weight="semibold">
              {remainingQuota} remaining
            </Text>
          ) : null}
        </View>

        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}

        {/* Visual progress bar only if backend provided finite limit */}
        {!unlimited && hasCounts ? (
          <View className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
            <View
              className={`h-full rounded-full ${
                percentage >= 90
                  ? "bg-rose-500"
                  : percentage >= 70
                    ? "bg-amber-500"
                    : "bg-brand"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </View>
        ) : null}

        {!isAllowed && denialReason ? (
          <Text variant="caption" tone="error" className="text-[11px] pt-1">
            {denialReason}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
