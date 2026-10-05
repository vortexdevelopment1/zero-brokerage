/**
 * Support Center Screen
 *
 * Provides:
 * 1. Approved Help & Contact categories.
 * 2. Active support request tracking.
 * 3. Quick action to open new support request.
 */

import React from "react";
import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Card, Pressable, Stack, Text } from "@/components/primitives";
import { EmptyState, Skeleton } from "@/components/feedback";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";
import { colors } from "@/theme/tokens";
import { useSupportTickets } from "../hooks/useSupportTickets";
import type {
  SupportCategory,
  SupportTicketRecord,
  SupportTicketStatus,
} from "../types/support.types";

const HELP_TOPICS: Array<{
  category: SupportCategory;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    category: "VISIT_HELP",
    title: "Visits & Tours",
    description: "Reschedule, cancel, or get help with property visit appointments.",
    icon: "📅",
  },
  {
    category: "INQUIRY_HELP",
    title: "Inquiries & Messages",
    description: "Assistance with agent responses, commercial terms, or inquiries.",
    icon: "💬",
  },
  {
    category: "TECHNICAL_ISSUE",
    title: "App & Technical",
    description: "Report application loading errors, OTP delays, or visual issues.",
    icon: "⚙️",
  },
  {
    category: "LISTING_REPORT",
    title: "Report Property",
    description: "Flag inaccurate pricing, misleading photos, or duplicate listings.",
    icon: "🚩",
  },
  {
    category: "ACCOUNT_PRIVACY",
    title: "Security & Privacy",
    description: "Account deletion, session termination, or data queries.",
    icon: "🔒",
  },
  {
    category: "GENERAL_INQUIRY",
    title: "General Inquiries",
    description: "Learn more about the zero-commission direct model.",
    icon: "ℹ️",
  },
];

function getStatusBadge(status: SupportTicketStatus): {
  label: string;
  badgeStyle: { backgroundColor: string; borderColor: string };
} {
  switch (status) {
    case "SUBMITTED":
      return {
        label: "SUBMITTED",
        badgeStyle: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
      };
    case "IN_REVIEW":
      return {
        label: "IN REVIEW",
        badgeStyle: { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" },
      };
    case "RESOLVED":
      return {
        label: "RESOLVED",
        badgeStyle: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
      };
    case "CLOSED":
    default:
      return {
        label: "CLOSED",
        badgeStyle: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
      };
  }
}

export function SupportCenterScreen() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  const { tickets, isLoading, isRefreshing, refresh } = useSupportTickets({
    enabled: isAuthenticated,
  });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  function handleSelectTopic(category: SupportCategory) {
    router.push({
      pathname: ROUTES.SUPPORT_REQUEST as any,
      params: { category },
    });
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-surface">
        {/* Header */}
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
                  HELP & ASSISTANCE
                </Text>
                <Text variant="h2" tone="primary" weight="bold">
                  Support
                </Text>
              </View>
            </View>

            <Button
              label="+ New Ticket"
              size="small"
              variant="primary"
              onPress={() => router.push(ROUTES.SUPPORT_REQUEST as any)}
              accessibilityLabel="Create a new support ticket"
            />
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            isAuthenticated ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refresh}
                tintColor={colors.brand.primary}
              />
            ) : undefined
          }
        >
          <Stack spacing={6}>
            {/* Active Tickets Section (if authenticated and has tickets) */}
            {isAuthenticated && (
              <Stack spacing={3}>
                <Text variant="title" tone="primary" weight="bold">
                  Your Support Requests
                </Text>

                {isLoading ? (
                  <Skeleton height={64} borderRadius={12} />
                ) : tickets.length === 0 ? (
                  <Card
                    variant="outlined"
                    padding="medium"
                    radius="large"
                    className="border-dashed border-default-border bg-surface-muted"
                  >
                    <Text variant="bodySmall" tone="muted" className="text-center">
                      You have no active support requests.
                    </Text>
                  </Card>
                ) : (
                  tickets.map((ticket) => {
                    const badge = getStatusBadge(ticket.status);
                    return (
                      <Card
                        key={ticket.id}
                        variant="outlined"
                        padding="medium"
                        radius="large"
                        className="border-default-border bg-surface"
                      >
                        <Stack spacing={2}>
                          <View className="flex-row items-center justify-between">
                            <Text variant="caption" tone="brand" weight="bold">
                              {ticket.ticketNumber}
                            </Text>
                            <View
                              style={[
                                {
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  borderWidth: 1,
                                },
                                badge.badgeStyle,
                              ]}
                            >
                              <Text
                                variant="caption"
                                tone="primary"
                                weight="bold"
                                className="text-[10px]"
                              >
                                {badge.label}
                              </Text>
                            </View>
                          </View>
                          <Text variant="body" tone="primary" weight="bold">
                            {ticket.subject}
                          </Text>
                          <Text
                            variant="caption"
                            tone="secondary"
                            numberOfLines={2}
                          >
                            {ticket.message}
                          </Text>
                        </Stack>
                      </Card>
                    );
                  })
                )}
              </Stack>
            )}

            {/* Help Categories Section */}
            <Stack spacing={3}>
              <Text variant="title" tone="primary" weight="bold">
                How can we help?
              </Text>
              <Text variant="bodySmall" tone="secondary">
                Select an approved category to submit an inquiry to our concierge team.
              </Text>

              <View className="space-y-3">
                {HELP_TOPICS.map((topic) => (
                  <Pressable
                    key={topic.category}
                    onPress={() => handleSelectTopic(topic.category)}
                    accessibilityRole="button"
                    accessibilityLabel={`${topic.title}. ${topic.description}`}
                    className="active:opacity-80 mb-2"
                  >
                    <Card
                      variant="outlined"
                      padding="medium"
                      radius="large"
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.defaultBorder,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center space-x-3 flex-1 pr-2">
                          <Text className="text-2xl">{topic.icon}</Text>
                          <Stack spacing={1} className="flex-1">
                            <Text variant="body" tone="primary" weight="bold">
                              {topic.title}
                            </Text>
                            <Text variant="caption" tone="muted">
                              {topic.description}
                            </Text>
                          </Stack>
                        </View>
                        <Text variant="body" tone="secondary" weight="bold">
                          ›
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </Stack>
          </Stack>
        </ScrollView>
      </View>
    </AppContainer>
  );
}
