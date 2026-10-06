/**
 * Current User Subscription Screen (Step 9A)
 *
 * Strict Compliance:
 * 1. Shows server-confirmed subscription and entitlement state.
 * 2. NO client-side formula calculations or quota estimations.
 * 3. Shows honest empty state when no active subscription is returned.
 * 4. Cancellation/renewal actions are clearly marked as pending backend activation.
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
import { useCurrentSubscription } from "../hooks/useCurrentSubscription";
import { useEntitlements } from "../hooks/useEntitlements";
import { StatusBadge } from "../components/StatusBadge";
import { EntitlementProgressCard } from "../components/EntitlementProgressCard";
import { FinancialErrorState } from "../components/FinancialErrorState";
import { mapSubscriptionStatusToPresentation } from "../utils/status-mappings";

export function CurrentSubscriptionScreen() {
  const isAuthenticated = useAuthStore((state) => state.status === "AUTHENTICATED");
  const {
    subscription,
    isLoading: isSubLoading,
    isRefreshing: isSubRefreshing,
    error: subError,
    refresh: refreshSub,
  } = useCurrentSubscription();

  const {
    entitlements,
    isLoading: isEntLoading,
    refresh: refreshEnt,
  } = useEntitlements();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.ACCOUNT as any);
    }
  }

  function handleRefreshAll() {
    refreshSub();
    refreshEnt();
  }

  const isRefreshing = isSubRefreshing;
  const statusPresentation = subscription
    ? mapSubscriptionStatusToPresentation(subscription.state)
    : null;

  return (
    <AppContainer>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <View className="flex-row items-center justify-between mb-2">
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="py-1 pr-3"
            >
              <Text variant="title" tone="brand" weight="bold">
                ‹ Account
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(ROUTES.PAYMENT_HISTORY as any)}
              accessibilityRole="button"
              accessibilityLabel="View payment history"
              className="px-2.5 py-1 rounded-md bg-surface-muted border border-default-border active:opacity-75"
            >
              <Text variant="caption" tone="primary" weight="semibold">
                History
              </Text>
            </Pressable>
          </View>

          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[10px]"
          >
            ACTIVE MEMBERSHIP
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Subscription Status
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefreshAll}
            />
          }
        >
          <Stack spacing={4}>
            {!isAuthenticated ? (
              <Card
                variant="outlined"
                padding="large"
                radius="large"
                className="border-default-border bg-surface"
              >
                <EmptyState
                  title="Sign In to View Membership"
                  description="Access your active subscription tier, remaining search allowances, and billing history."
                  actionLabel="Sign In"
                  onAction={() => router.push(ROUTES.AUTH_SIGN_IN as any)}
                />
              </Card>
            ) : null}

            {isAuthenticated && subError ? (
              <FinancialErrorState error={subError} onRetry={handleRefreshAll} />
            ) : null}

            {/* Active Subscription Details */}
            {isAuthenticated && !subError && subscription && statusPresentation ? (
              <>
                <Card
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-default-border bg-surface"
                >
                  <Stack spacing={4}>
                    <View className="flex-row items-start justify-between">
                      <Stack spacing={1} className="flex-1 pr-2">
                        <Text variant="caption" tone="brand" weight="bold" className="uppercase text-[10px]">
                          CURRENT TIER
                        </Text>
                        <Text variant="h2" tone="primary" weight="bold">
                          {subscription.planName}
                        </Text>
                        <Text variant="bodySmall" tone="secondary">
                          {subscription.billingInterval.toLowerCase()} billing cycle
                        </Text>
                      </Stack>

                      <StatusBadge presentation={statusPresentation} />
                    </View>

                    {/* Dates & Billing info */}
                    <View className="pt-2 border-t border-subtle-border">
                      <Stack spacing={2}>
                        {subscription.currentPeriodEnd ? (
                          <View className="flex-row justify-between py-1 border-b border-subtle-border">
                            <Text variant="bodySmall" tone="secondary">
                              Current Period Ends
                            </Text>
                            <Text variant="bodySmall" tone="primary" weight="semibold">
                              {subscription.currentPeriodEnd}
                            </Text>
                          </View>
                        ) : null}

                        {subscription.nextBillingDate ? (
                          <View className="flex-row justify-between py-1 border-b border-subtle-border">
                            <Text variant="bodySmall" tone="secondary">
                              Next Billing Date
                            </Text>
                            <Text variant="bodySmall" tone="primary" weight="semibold">
                              {subscription.nextBillingDate}
                            </Text>
                          </View>
                        ) : null}

                        {subscription.renewalState ? (
                          <View className="flex-row justify-between py-1 border-b border-subtle-border">
                            <Text variant="bodySmall" tone="secondary">
                              Renewal Mode
                            </Text>
                            <Text variant="bodySmall" tone="primary" weight="semibold">
                              {subscription.renewalState.replace("_", " ")}
                            </Text>
                          </View>
                        ) : null}

                        {subscription.cancellationEffectiveDate ? (
                          <View className="flex-row justify-between py-1">
                            <Text variant="bodySmall" tone="warning">
                              Cancels On
                            </Text>
                            <Text variant="bodySmall" tone="warning" weight="semibold">
                              {subscription.cancellationEffectiveDate}
                            </Text>
                          </View>
                        ) : null}
                      </Stack>
                    </View>
                  </Stack>
                </Card>

                {/* Live Entitlements */}
                <View>
                  <Text variant="title" tone="primary" weight="bold" className="mb-2">
                    Included Entitlements & Allowances
                  </Text>
                  {entitlements.length > 0 ? (
                    entitlements.map((item) => (
                      <EntitlementProgressCard key={item.featureKey} item={item} />
                    ))
                  ) : (
                    <Card
                      variant="outlined"
                      padding="medium"
                      radius="medium"
                      className="border-default-border bg-surface-muted"
                    >
                      <Text variant="caption" tone="secondary">
                        Tier entitlements and limits will update automatically once verified by the backend engine.
                      </Text>
                    </Card>
                  )}
                </View>

                {/* Management Actions (Disabled until backend Step 9 cancellation/renewal routes exist) */}
                <Card
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-default-border bg-surface-muted"
                >
                  <Stack spacing={3}>
                    <Text variant="title" tone="primary" weight="semibold">
                      Subscription Management
                    </Text>
                    <Text variant="caption" tone="secondary">
                      Automated renewal management and self-service cancellation will become active with the backend payments release.
                    </Text>
                    <View className="flex-row space-x-3 pt-1">
                      <View className="flex-1">
                        <Button
                          label="Change Plan"
                          onPress={() => router.push(ROUTES.SUBSCRIPTION_PLANS as any)}
                          variant="secondary"
                          size="medium"
                          fullWidth
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Cancel"
                          disabled={true}
                          onPress={() => {}}
                          variant="destructive"
                          size="medium"
                          fullWidth
                          accessibilityLabel="Cancellation currently pending backend service activation"
                        />
                      </View>
                    </View>
                  </Stack>
                </Card>
              </>
            ) : null}

            {/* Empty State when User has no active subscription */}
            {isAuthenticated && !subError && !isSubLoading && !subscription ? (
              <Card
                variant="outlined"
                padding="large"
                radius="large"
                className="border-default-border bg-surface"
              >
                <EmptyState
                  title="No Active Membership Found"
                  description="You are currently on the complimentary Community Explorer tier. Upgrade to unlock direct owner contact allowances and priority search access."
                  actionLabel="Explore Membership Plans"
                  onAction={() => router.push(ROUTES.SUBSCRIPTION_PLANS as any)}
                />
              </Card>
            ) : null}
          </Stack>
        </ScrollView>
      </View>
    </AppContainer>
  );
}
