/**
 * Subscription Plans Catalog Screen (Step 9A)
 *
 * Strict Compliance:
 * 1. Renders ONLY backend-supplied plan data.
 * 2. NO hardcoded production pricing or fake discount promotions.
 * 3. Shows honest empty/unavailable state when backend service is pending.
 */

import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
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
import { useSubscriptionPlans } from "../hooks/useSubscriptionPlans";
import { PlanCard } from "../components/PlanCard";
import { FinancialErrorState } from "../components/FinancialErrorState";

export function SubscriptionPlansScreen() {
  const isAuthenticated = useAuthStore((state) => state.status === "AUTHENTICATED");
  const { plans, isLoading, isRefreshing, error, refresh } = useSubscriptionPlans();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.ACCOUNT as any);
    }
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <View className="flex-row items-center justify-between mb-2">
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back to previous screen"
              className="py-1 pr-3"
            >
              <Text variant="title" tone="brand" weight="bold">
                ‹ Back
              </Text>
            </Pressable>

            {isAuthenticated ? (
              <View className="flex-row items-center space-x-2">
                <Pressable
                  onPress={() => router.push(ROUTES.SUBSCRIPTION_CURRENT as any)}
                  accessibilityRole="button"
                  accessibilityLabel="View my membership"
                  className="px-2.5 py-1 rounded-md bg-brand-light border border-brand/20 active:opacity-75"
                >
                  <Text variant="caption" tone="brand" weight="bold">
                    My Membership
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[10px]"
          >
            MEMBERSHIP & PLANS
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Zero Brokerage Plans
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
        >
          <Stack spacing={4}>
            {/* Context Note */}
            <Card
              variant="outlined"
              padding="medium"
              radius="medium"
              className="border-default-border bg-surface-muted"
            >
              <Text variant="caption" tone="secondary" className="leading-5">
                Zero Brokerage direct membership unlocks priority property search, direct owner contact quotas, and curated furniture perks without intermediary brokerage commissions.
              </Text>
            </Card>

            {/* Error State */}
            {error ? (
              <FinancialErrorState error={error} onRetry={refresh} />
            ) : null}

            {/* Loading / Plan Cards / Empty State */}
            {!error && !isLoading && plans.length > 0 ? (
              plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
            ) : null}

            {/* Honest Empty State when Backend Step 9 has no published plans */}
            {!error && !isLoading && plans.length === 0 ? (
              <Card
                variant="outlined"
                padding="large"
                radius="large"
                className="border-default-border bg-surface mt-2"
              >
                <EmptyState
                  title="Plans Currently Being Configured"
                  description="Our subscription plans are being configured by the platform team. Membership checkout will be available once the plans are published."
                  actionLabel={isAuthenticated ? "View My Membership" : "Sign In to Account"}
                  onAction={() => {
                    if (isAuthenticated) {
                      router.push(ROUTES.SUBSCRIPTION_CURRENT as any);
                    } else {
                      router.push(ROUTES.AUTH_SIGN_IN as any);
                    }
                  }}
                />
              </Card>
            ) : null}

            {/* Quick Links Footer */}
            {isAuthenticated ? (
              <View className="pt-2 border-t border-subtle-border">
                <Pressable
                  onPress={() => router.push(ROUTES.PAYMENT_HISTORY as any)}
                  accessibilityRole="button"
                  accessibilityLabel="View payment and transaction history"
                  className="flex-row items-center justify-between py-3 px-3 rounded-lg bg-surface-muted border border-default-border active:opacity-75"
                >
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-base mr-1">📜</Text>
                    <Text variant="bodySmall" tone="primary" weight="semibold">
                      Payment & Transaction History
                    </Text>
                  </View>
                  <Text variant="caption" tone="secondary">
                    ›
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </Stack>
        </ScrollView>
      </View>
    </AppContainer>
  );
}
