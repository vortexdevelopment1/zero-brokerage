/**
 * Furniture Order History Screen
 *
 * Blueprint Step 8 Compliance:
 * 1. Complete order and active rental management for the authenticated user.
 * 2. Status categorization: All, Active Rentals, Purchases, Returns & Claims.
 * 3. Shows order number, item count, mode, status badge, delivery, and total amounts.
 * 4. Account isolation: clears and blocks access when unauthenticated.
 */

import React, { useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Card, Pressable, Text } from "@/components/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import {
  ROUTES,
  getFurnitureOrderDetailRoute,
} from "@/navigation/routes";
import { colors } from "@/theme/tokens";
import { useFurnitureOrders } from "../hooks/useFurnitureOrders";
import { FurnitureStatusBadge } from "../components";
import type { FurnitureHistoryFilterCategory, FurnitureOrder } from "../types/furniture.types";

const FILTER_TABS: Array<{ key: FurnitureHistoryFilterCategory; label: string }> = [
  { key: "ALL", label: "All Orders" },
  { key: "ACTIVE_RENTAL", label: "Active Rentals" },
  { key: "PURCHASE", label: "Purchases" },
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "RETURNS", label: "Returns" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "FAILED", label: "Failed" },
  { key: "CLAIMS", label: "Claims & Support" },
];

export function FurnitureOrderHistoryScreen() {
  const [activeTab, setActiveTab] = useState<FurnitureHistoryFilterCategory>("ALL");

  const {
    orders,
    isLoading,
    isRefreshing,
    errorMessage,
    refetch,
    isAuthenticated,
  } = useFurnitureOrders({ statusFilter: activeTab });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/furniture" as any);
    }
  }

  function handleSignIn() {
    router.push(ROUTES.AUTH_SIGN_IN as any);
  }

  function handleOrderPress(order: FurnitureOrder) {
    router.push(getFurnitureOrderDetailRoute(order.id) as any);
  }

  function handleExploreMarketplace() {
    router.push("/furniture" as any);
  }

  return (
    <AppContainer style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text variant="title" style={styles.headerTitle}>
          Furniture & Rentals
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Horizontally Scrollable Status Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Filter ${tab.label}`}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabBtn,
                  isSelected ? styles.tabBtnActive : styles.tabBtnInactive,
                ]}
              >
                <Text
                  variant="label"
                  style={[
                    styles.tabText,
                    isSelected ? styles.tabTextActive : styles.tabTextInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      {!isAuthenticated ? (
        <View style={styles.unauthBox}>
          <Text variant="title" style={styles.unauthTitle}>
            Sign In to View Orders
          </Text>
          <Text variant="body" style={styles.unauthText}>
            Access your active furniture subscriptions, delivery tracking, and returns.
          </Text>
          <Button
            label="Sign In"
            onPress={handleSignIn}
            variant="primary"
            size="medium"
            style={{ marginTop: 14 }}
          />
        </View>
      ) : isLoading ? (
        <View style={styles.loadingPadding}>
          <Skeleton width="100%" height={120} borderRadius={12} />
          <View style={{ height: 12 }} />
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load orders"
          message={errorMessage}
          retryLabel="Try Again"
          onRetry={refetch}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No furniture orders yet"
          description={
            activeTab === "ALL"
              ? "You haven't ordered any furniture or office setups yet."
              : `No orders found under ${activeTab.toLowerCase().replace("_", " ")}.`
          }
          actionLabel="Browse Marketplace"
          onAction={handleExploreMarketplace}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.orderCard} variant="elevated">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Order ${item.orderNumber}, ${item.status}`}
                onPress={() => handleOrderPress(item)}
                style={styles.cardPressable}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text variant="title" style={styles.orderRef}>
                      {item.orderNumber}
                    </Text>
                    <Text variant="caption" style={styles.orderDate}>
                      Ordered on {new Date(item.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                  <FurnitureStatusBadge status={item.status} size="sm" />
                </View>

                <View style={styles.itemsSummary}>
                  {item.items.map((line, idx) => (
                    <Text key={idx} variant="body" numberOfLines={1} style={styles.lineItem}>
                      • {line.assetName} (x{line.quantity})
                    </Text>
                  ))}
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text variant="caption" style={styles.footerLabel}>
                      {item.mode === "RENTAL" ? "Monthly Rent" : "Total Paid"}
                    </Text>
                    <Text variant="body" style={styles.footerAmount}>
                      ₹{(item.mode === "RENTAL" ? item.recurringRentPerPeriod : item.totalDueNow).toLocaleString("en-IN")}
                      {item.mode === "RENTAL" ? " /mo" : ""}
                    </Text>
                  </View>

                  <View style={styles.deliveryBadge}>
                    <Text variant="caption" style={styles.deliveryStatusText}>
                      🚚 {item.deliveryStatus.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={colors.brand.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultBorder,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 28,
    lineHeight: 30,
    color: colors.primaryContent,
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryContent,
    flex: 1,
    textAlign: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultBorder,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.brand.primary,
  },
  tabBtnInactive: {
    backgroundColor: colors.mutedSurface,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.inverseContent,
  },
  tabTextInactive: {
    color: colors.secondaryContent,
  },
  unauthBox: {
    margin: 24,
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.defaultBorder,
  },
  unauthTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  unauthText: {
    color: colors.secondaryContent,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  loadingPadding: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
  },
  cardPressable: {
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderRef: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryContent,
  },
  orderDate: {
    color: colors.mutedContent,
    fontSize: 11,
    marginTop: 2,
  },
  itemsSummary: {
    marginVertical: 10,
    gap: 3,
  },
  lineItem: {
    fontSize: 13,
    color: colors.secondaryContent,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.subtleBorder,
  },
  footerLabel: {
    fontSize: 11,
    color: colors.secondaryContent,
  },
  footerAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.brand.primary,
    marginTop: 1,
  },
  deliveryBadge: {
    backgroundColor: colors.mutedSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliveryStatusText: {
    fontSize: 11,
    color: colors.secondaryContent,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});
