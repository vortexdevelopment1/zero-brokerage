/**
 * Plan Card Presentation Component (Step 9A)
 *
 * Strict Compliance:
 * 1. Renders ONLY backend-supplied plan data.
 * 2. NO hardcoded production pricing or fake discounts.
 * 3. Shows availability status clearly.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Pressable, Stack, Text } from "@/components/primitives";
import { getSubscriptionPlanDetailRoute } from "@/navigation/routes";
import type { SubscriptionPlan } from "../types/subscription.types";

interface PlanCardProps {
  readonly plan: SubscriptionPlan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const {
    id,
    name,
    description,
    billingInterval,
    displayPrice,
    currency,
    taxFeeLabels,
    includedEntitlements,
    availability,
    isFeatured,
  } = plan;

  const isAvailable = availability === "AVAILABLE";

  function handlePress() {
    router.push(getSubscriptionPlanDetailRoute(id) as any);
  }

  const intervalLabels: Record<string, string> = {
    MONTHLY: "per month",
    QUARTERLY: "per quarter",
    SEMI_ANNUAL: "per 6 months",
    ANNUAL: "per year",
    ONE_TIME: "one-time",
  };

  return (
    <Card
      variant="outlined"
      padding="large"
      radius="large"
      className={`mb-4 border-default-border bg-surface ${
        isFeatured ? "border-brand shadow-sm" : ""
      }`}
      accessibilityRole="button"
      accessibilityLabel={`Plan ${name}. ${
        displayPrice ? `Price: ${currency ? currency + " " : ""}${displayPrice}` : "Pricing unavailable"
      }`}
    >
      <Stack spacing={4}>
        {/* Header & Badges */}
        <View className="flex-row items-start justify-between">
          <Stack spacing={1} className="flex-1 pr-2">
            {isFeatured ? (
              <View className="self-start px-2 py-0.5 rounded bg-brand-light border border-brand/20 mb-1">
                <Text
                  variant="caption"
                  tone="brand"
                  weight="bold"
                  className="text-[10px] tracking-wider uppercase"
                >
                  RECOMMENDED
                </Text>
              </View>
            ) : null}
            <Text variant="h3" tone="primary" weight="bold">
              {name}
            </Text>
            <Text variant="bodySmall" tone="secondary">
              {description}
            </Text>
          </Stack>

          <View
            className={`px-2.5 py-1 rounded-full border ${
              isAvailable
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            }`}
          >
            <Text
              variant="caption"
              tone={isAvailable ? "success" : "secondary"}
              weight="bold"
              className="text-[10px] uppercase tracking-wider"
            >
              {availability.replace("_", " ")}
            </Text>
          </View>
        </View>

        {/* Pricing Area (rendered ONLY when provided by backend) */}
        {displayPrice ? (
          <View className="py-2 border-y border-subtle-border">
            <View className="flex-row items-baseline space-x-1">
              {currency ? (
                <Text variant="title" tone="primary" weight="semibold">
                  {currency}
                </Text>
              ) : null}
              <Text variant="h1" tone="primary" weight="bold">
                {displayPrice}
              </Text>
              <Text variant="caption" tone="secondary" className="ml-1">
                {intervalLabels[billingInterval] || billingInterval}
              </Text>
            </View>

            {taxFeeLabels && taxFeeLabels.length > 0 ? (
              <Text variant="caption" tone="muted" className="mt-0.5 text-[11px]">
                {taxFeeLabels.join(" • ")}
              </Text>
            ) : null}
          </View>
        ) : (
          <View className="py-2 border-y border-subtle-border">
            <Text variant="caption" tone="muted">
              Authoritative pricing confirmed during subscription activation.
            </Text>
          </View>
        )}

        {/* Included Benefits Preview */}
        {includedEntitlements && includedEntitlements.length > 0 ? (
          <Stack spacing={2}>
            <Text variant="caption" tone="secondary" weight="bold" className="uppercase tracking-wider text-[10px]">
              INCLUDED BENEFITS
            </Text>
            {includedEntitlements.slice(0, 4).map((entitlement, index) => (
              <View key={entitlement.key || index} className="flex-row items-center space-x-2">
                <Text variant="caption" tone="brand" weight="bold" className="mr-1">
                  ✓
                </Text>
                <Text variant="bodySmall" tone="primary" className="flex-1">
                  {entitlement.label}
                  {entitlement.limitDisplay ? ` (${entitlement.limitDisplay})` : ""}
                </Text>
              </View>
            ))}
          </Stack>
        ) : null}

        {/* Actions */}
        <View className="pt-2">
          <Button
            label="View Plan Details"
            onPress={handlePress}
            variant={isFeatured ? "primary" : "secondary"}
            size="medium"
            fullWidth
            accessibilityLabel={`View details for ${name}`}
          />
        </View>
      </Stack>
    </Card>
  );
}
