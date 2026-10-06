/**
 * Payment & Transaction History Screen (Step 9A)
 *
 * Strict Compliance:
 * 1. Shows backend-provided transaction records.
 * 2. NO fabricated transactions or fake receipts.
 * 3. Shows honest empty/unavailable state.
 */

import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import {
  Card,
  Pressable,
  Stack,
  Text,
} from "@/components/primitives";
import { EmptyState } from "@/components/feedback";
import { ROUTES } from "@/navigation/routes";
import { useAuthStore } from "@/services/auth";
import { usePaymentHistory } from "../hooks/usePaymentHistory";
import { PaymentHistoryItemRow } from "../components/PaymentHistoryItemRow";
import { FinancialErrorState } from "../components/FinancialErrorState";

export function PaymentHistoryScreen() {
  const isAuthenticated = useAuthStore((state) => state.status === "AUTHENTICATED");
  const {
    items,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = usePaymentHistory();

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
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back to account"
            className="py-1 pr-3 self-start mb-2"
          >
            <Text variant="title" tone="brand" weight="bold">
              ‹ Account
            </Text>
          </Pressable>

          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[10px]"
          >
            BILLING & TRANSACTIONS
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Payment History
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
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
                  title="Sign In to View Transactions"
                  description="Access payment receipts, membership billing records, and tax invoice statuses."
                  actionLabel="Sign In"
                  onAction={() => router.push(ROUTES.AUTH_SIGN_IN as any)}
                />
              </Card>
            ) : null}

            {isAuthenticated && error ? (
              <FinancialErrorState error={error} onRetry={refresh} />
            ) : null}

            {/* Transaction Ledger */}
            {isAuthenticated && !error && !isLoading && items.length > 0 ? (
              items.map((item) => (
                <PaymentHistoryItemRow key={item.id} item={item} />
              ))
            ) : null}

            {/* Empty State when no transactions found */}
            {isAuthenticated && !error && !isLoading && items.length === 0 ? (
              <Card
                variant="outlined"
                padding="large"
                radius="large"
                className="border-default-border bg-surface"
              >
                <EmptyState
                  title="No Billing Records Found"
                  description="You have no recorded payments or active billed transactions on your account."
                  actionLabel="Explore Membership Plans"
                  onAction={() => router.push(ROUTES.SUBSCRIPTION_PLANS as any)}
                />
              </Card>
            ) : null}

            {/* Support footer */}
            {isAuthenticated ? (
              <Card
                variant="outlined"
                padding="medium"
                radius="medium"
                className="border-default-border bg-surface-muted"
              >
                <Stack spacing={1}>
                  <Text variant="caption" tone="secondary" weight="bold" className="uppercase text-[10px]">
                    PAYMENT INQUIRIES & RECONCILIATION
                  </Text>
                  <Text variant="caption" tone="muted" className="leading-4">
                    For questions regarding debit confirmations or transaction reconciliation, our billing support team is available via the Help Concierge.
                  </Text>
                  <Pressable
                    onPress={() => router.push(ROUTES.SUPPORT as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Contact support"
                    className="pt-1"
                  >
                    <Text variant="caption" tone="brand" weight="bold">
                      Open Billing Concierge Ticket ›
                    </Text>
                  </Pressable>
                </Stack>
              </Card>
            ) : null}
          </Stack>
        </ScrollView>
      </View>
    </AppContainer>
  );
}
