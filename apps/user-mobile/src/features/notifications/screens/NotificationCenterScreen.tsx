/**
 * Notification Center Screen
 *
 * Blueprint Step 7 Compliance:
 * 1. Initial loading, pull-to-refresh, empty, error, offline states.
 * 2. Visual read/unread distinction with unread count badge.
 * 3. Mark single as read and mark-all-as-read actions.
 * 4. Safe deep-link navigation with authorization verification and fallback.
 * 5. Push permission UX integration.
 * 6. Account-scoped cache and logout cleanup.
 */

import React, { useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Pressable, Stack, Text } from "@/components/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";
import { resolveNotificationTarget } from "@/navigation/deep-links";
import { trackEvent } from "@/services/analytics/analytics";
import { colors } from "@/theme/tokens";
import { useNotifications } from "../hooks/useNotifications";
import { useNotificationMutations } from "../hooks/useNotificationMutations";
import { usePushPermission } from "../hooks/usePushPermission";
import { NotificationCard } from "../components/NotificationCard";
import { NotificationFilterBar } from "../components/NotificationFilterBar";
import { PushPermissionBanner } from "../components/PushPermissionBanner";
import type { NotificationItem } from "../types/notifications.types";

export function NotificationCenterScreen() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  const {
    notifications,
    unreadCount,
    category,
    setCategory,
    isLoading,
    isRefreshing,
    errorMessage,
    refetch,
    refresh,
  } = useNotifications({ enabled: isAuthenticated });

  const {
    markAsRead,
    markAllAsRead,
    isMarkingRead,
    isMarkingAllRead,
    mutationError,
  } = useNotificationMutations();

  const {
    status: pushStatus,
    isPromptVisible,
    showPrompt,
    dismissPrompt,
    grantPermission,
  } = usePushPermission();

  const [dismissedBanner, setDismissedBanner] = useState<boolean>(false);

  function handleSignIn() {
    router.push(ROUTES.AUTH_SIGN_IN as any);
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  async function handleNotificationPress(item: NotificationItem) {
    trackEvent("notification_opened", {
      notificationId: item.id,
      category: item.category,
      isRead: item.isRead,
    });

    // Mark as read in background if unread
    if (!item.isRead) {
      markAsRead(item.id, item.category);
    }

    // Resolve target navigation
    if (item.deepLinkUrl || item.relatedEntityType) {
      trackEvent("notification_deep_link_attempted", {
        notificationId: item.id,
        category: item.category,
      });

      const payload = {
        deepLinkUrl: item.deepLinkUrl ?? undefined,
        targetType:
          item.relatedEntityType === "VISIT"
            ? "VISIT_DETAIL"
            : item.relatedEntityType === "INQUIRY"
              ? "INQUIRY_DETAIL"
              : item.relatedEntityType === "LISTING"
                ? "LISTING_DETAIL"
                : item.relatedEntityType === "ACCOUNT"
                  ? "ACCOUNT"
                  : item.relatedEntityType === "SUPPORT"
                    ? "SUPPORT"
                    : undefined,
        visitId: item.relatedEntityType === "VISIT" ? item.relatedEntityId ?? undefined : undefined,
        inquiryId: item.relatedEntityType === "INQUIRY" ? item.relatedEntityId ?? undefined : undefined,
        listingId: item.relatedEntityType === "LISTING" ? item.relatedEntityId ?? undefined : undefined,
      };

      const result = resolveNotificationTarget(payload, isAuthenticated);

      if (result.status === "NAVIGATE") {
        router.push(result.route as any);
      } else if (result.status === "REQUIRES_AUTH") {
        router.push(ROUTES.AUTH_SIGN_IN as any);
      } else {
        trackEvent("notification_deep_link_failed", {
          notificationId: item.id,
          reason: result.reason,
        });
        Alert.alert(
          "Notice",
          "The resource associated with this notification is no longer available or cannot be accessed.",
          [{ text: "OK" }],
        );
      }
    }
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-surface">
        {/* Top Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Pressable
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                className="w-9 h-9 rounded-full bg-surface-muted items-center justify-center active:opacity-70 mr-2"
              >
                <Text variant="body" tone="primary" weight="bold">
                  ←
                </Text>
              </Pressable>

              <View>
                <Text
                  variant="label"
                  tone="brand"
                  weight="bold"
                  className="tracking-widest uppercase text-[10px]"
                >
                  ACTIVITY ALERTS
                </Text>
                <View className="flex-row items-center space-x-2">
                  <Text variant="h2" tone="primary" weight="bold">
                    Notifications
                  </Text>
                  {unreadCount > 0 && (
                    <View
                      style={{
                        backgroundColor: colors.brand.primary,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        marginLeft: 6,
                      }}
                      accessibilityLabel={`${unreadCount} unread notifications`}
                    >
                      <Text
                        variant="caption"
                        tone="inverse"
                        weight="bold"
                        className="text-[11px]"
                      >
                        {unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {isAuthenticated && unreadCount > 0 && (
              <Button
                label={isMarkingAllRead ? "Updating..." : "Mark all read"}
                variant="tertiary"
                size="small"
                onPress={handleMarkAllRead}
                disabled={isMarkingAllRead}
                accessibilityLabel="Mark all notifications as read"
              />
            )}
          </View>
        </View>

        {/* Guest Guard */}
        {!isAuthenticated ? (
          <View className="flex-1 justify-center px-5">
            <EmptyState
              title="Sign In to View Notifications"
              description="Sign in with your mobile number to view personal tour confirmations, agent messages, and price alerts."
              actionLabel="Sign In with Mobile"
              onAction={handleSignIn}
            />
          </View>
        ) : (
          <View className="flex-1">
            {/* Category Filter Pills */}
            <NotificationFilterBar
              selectedCategory={category}
              onSelectCategory={setCategory}
            />

            {/* Mutation Error Banner if mark-read fails */}
            {mutationError && (
              <View className="mx-5 my-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <Text variant="caption" tone="error" weight="semibold">
                  {mutationError}
                </Text>
              </View>
            )}

            {/* Main Content Area */}
            {isLoading ? (
              <View className="p-5 space-y-4">
                <Skeleton height={80} borderRadius={12} />
                <Skeleton height={80} borderRadius={12} />
                <Skeleton height={80} borderRadius={12} />
                <Skeleton height={80} borderRadius={12} />
              </View>
            ) : errorMessage ? (
              <View className="flex-1 justify-center px-5">
                <ErrorState
                  title="Unable to Load Notifications"
                  message={errorMessage}
                  onRetry={refetch}
                  retryLabel="Try Again"
                />
              </View>
            ) : notifications.length === 0 ? (
              <View className="flex-1 justify-center px-5">
                <EmptyState
                  title={
                    category === "ALL"
                      ? "No Notifications Yet"
                      : `No ${category.replace("_UPDATE", "").toLowerCase()} alerts`
                  }
                  description="When you schedule visits, submit inquiries, or save properties, your updates will appear here."
                  actionLabel="Explore Properties"
                  onAction={() => router.push(ROUTES.DISCOVER as any)}
                />
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={refresh}
                    tintColor={colors.brand.primary}
                    colors={[colors.brand.primary]}
                  />
                }
                ListHeaderComponent={
                  !dismissedBanner && pushStatus === "UNDETERMINED" ? (
                    <PushPermissionBanner
                      onEnable={() => {
                        grantPermission();
                        setDismissedBanner(true);
                      }}
                      onDismiss={() => {
                        dismissPrompt();
                        setDismissedBanner(true);
                      }}
                    />
                  ) : null
                }
                renderItem={({ item }) => (
                  <NotificationCard
                    item={item}
                    onPress={handleNotificationPress}
                    onMarkRead={(it) => markAsRead(it.id, it.category)}
                    isMarkingRead={isMarkingRead(item.id)}
                  />
                )}
              />
            )}
          </View>
        )}
      </View>
    </AppContainer>
  );
}
