/**
 * Subscription Plan Detail Screen (Step 9A)
 *
 * Strict Compliance:
 * 1. Shows backend-provided plan details, limits, eligibility, and renewal information.
 * 2. Purchase action is clearly DISABLED with honest messaging explaining that online checkout is pending backend contract activation.
 * 3. NO fake checkout orders, fake tokens, or simulated payments.
 */

import React from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import {
  Button,
  Card,
  Pressable,
  Stack,
  Text,
} from "@/components/primitives";
import { EmptyState } from "@/components/feedback";
import { ROUTES } from "@/navigation/routes";
import { useAuthStore } from "@/services/auth";
import { useSubscriptionPlanDetail } from "../hooks/useSubscriptionPlanDetail";
import { FinancialErrorState } from "../components/FinancialErrorState";

interface SubscriptionPlanDetailScreenProps {
  readonly planId: string;
}

export function SubscriptionPlanDetailScreen({
  planId,
}: SubscriptionPlanDetailScreenProps) {
  const isAuthenticated = useAuthStore((state) => state.status === "AUTHENTICATED");
  const { plan, isLoading, error, refetch } = useSubscriptionPlanDetail({ planId });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.SUBSCRIPTION_PLANS as any);
    }
  }

  const intervalLabels: Record<string, string> = {
    MONTHLY: "Monthly Billing",
    QUARTERLY: "Quarterly Billing",
    SEMI_ANNUAL: "Semi-Annual Billing",
    ANNUAL: "Annual Billing",
    ONE_TIME: "One-Time Payment",
  };

  return (
    <AppContainer>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back to all plans"
            className="py-1 pr-3 self-start mb-2"
          >
            <Text variant="title" tone="brand" weight="bold">
              ‹ All Plans
            </Text>
          </Pressable>

          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[10px]"
          >
            PLAN SPECIFICATION
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            {plan?.name || "Plan Details"}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <Stack spacing={4}>
            {error ? (
              <FinancialErrorState error={error} onRetry={refetch} />
            ) : null}

            {!error && !isLoading && !plan ? (
              <Card
                variant="outlined"
                padding="large"
                radius="large"
                className="border-default-border bg-surface"
              >
                <EmptyState
                  title="Plan Details Unavailable"
                  description="This membership plan specification is currently updating on the server. Please browse other available plans."
                  actionLabel="Back to Plans"
                  onAction={() => router.replace(ROUTES.SUBSCRIPTION_PLANS as any)}
                />
              </Card>
            ) : null}

            {plan ? (
              <>
                {/* Overview Card */}
                <Card
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-default-border bg-surface"
                >
                  <Stack spacing={3}>
                    <View className="flex-row items-center justify-between">
                      <Text variant="caption" tone="brand" weight="bold" className="uppercase text-[10px]">
                        {intervalLabels[plan.billingInterval] || plan.billingInterval}
                      </Text>
                      <View className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <Text variant="caption" tone="success" weight="bold" className="text-[10px] uppercase">
                          {plan.availability.replace("_", " ")}
                        </Text>
                      </View>
                    </View>

                    <Text variant="h2" tone="primary" weight="bold">
                      {plan.name}
                    </Text>

                    <Text variant="bodySmall" tone="secondary" className="leading-5">
                      {plan.description}
                    </Text>

                    {plan.displayPrice ? (
                      <View className="pt-2 border-t border-subtle-border flex-row items-baseline space-x-1">
                        {plan.currency ? (
                          <Text variant="title" tone="primary" weight="semibold">
                            {plan.currency}
                          </Text>
                        ) : null}
                        <Text variant="h1" tone="primary" weight="bold">
                          {plan.displayPrice}
                        </Text>
                        <Text variant="caption" tone="secondary" className="ml-1">
                          /{plan.billingInterval.toLowerCase()}
                        </Text>
                      </View>
                    ) : (
                      <View className="pt-2 border-t border-subtle-border">
                        <Text variant="caption" tone="muted">
                          Official pricing confirmed at checkout initiation.
                        </Text>
                      </View>
                    )}

                    {plan.taxFeeLabels && plan.taxFeeLabels.length > 0 ? (
                      <Text variant="caption" tone="muted" className="text-[11px]">
                        {plan.taxFeeLabels.join(" • ")}
                      </Text>
                    ) : null}
                  </Stack>
                </Card>

                {/* Included Benefits & Limits */}
                <Card
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-default-border bg-surface"
                >
                  <Stack spacing={3}>
                    <Text variant="title" tone="primary" weight="bold">
                      Included Entitlements & Features
                    </Text>

                    {plan.includedEntitlements.map((item, index) => (
                      <View
                        key={item.key || index}
                        className="py-2 border-b border-subtle-border last:border-b-0"
                      >
                        <View className="flex-row items-start justify-between">
                          <Text variant="bodySmall" tone="primary" weight="semibold" className="flex-1 mr-2">
                            {item.label}
                          </Text>
                          {item.limitDisplay ? (
                            <Text variant="caption" tone="brand" weight="bold">
                              {item.limitDisplay}
                            </Text>
                          ) : null}
                        </View>
                        {item.description ? (
                          <Text variant="caption" tone="muted" className="mt-0.5">
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </Stack>
                </Card>

                {/* Eligibility & Renewal Terms */}
                <Card
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-default-border bg-surface-muted"
                >
                  <Stack spacing={3}>
                    <Text variant="title" tone="primary" weight="semibold">
                      Terms & Eligibility
                    </Text>

                    <Stack spacing={2}>
                      <View>
                        <Text variant="caption" tone="secondary" weight="bold" className="uppercase text-[10px]">
                          ELIGIBILITY
                        </Text>
                        <Text variant="bodySmall" tone="primary">
                          {plan.eligibility || "Open to all verified Zero Brokerage members."}
                        </Text>
                      </View>

                      {plan.trialIntroductoryTerms ? (
                        <View>
                          <Text variant="caption" tone="secondary" weight="bold" className="uppercase text-[10px]">
                            TRIAL TERMS
                          </Text>
                          <Text variant="bodySmall" tone="primary">
                            {plan.trialIntroductoryTerms}
                          </Text>
                        </View>
                      ) : null}

                      <View>
                        <Text variant="caption" tone="secondary" weight="bold" className="uppercase text-[10px]">
                          RENEWAL & CANCELLATION
                        </Text>
                        <Text variant="bodySmall" tone="primary">
                          {plan.renewalCancellationInfo ||
                            "Plans can be managed in your account. Self-service renewal and cancellation will activate with the billing release."}
                        </Text>
                      </View>
                    </Stack>
                  </Stack>
                </Card>

                {/* Checkout Action (Deliberately Disabled / Safe Contract Boundary) */}
                <View className="pt-2">
                  <Button
                    label="Checkout Currently Unavailable"
                    disabled={true}
                    onPress={() => {}}
                    variant="primary"
                    size="large"
                    fullWidth
                    accessibilityLabel="Checkout currently unavailable pending backend contract activation"
                  />
                  <Text variant="caption" tone="muted" className="text-center mt-2 px-2 text-[11px]">
                    Online payment gateway integration (Step 9) is completing backend activation. No transactions can be processed yet.
                  </Text>
                </View>
              </>
            ) : null}
          </Stack>
        </ScrollView>
      </View>
    </AppContainer>
  );
}
