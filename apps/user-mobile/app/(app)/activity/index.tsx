/**
 * Activity Tab
 *
 * Authoritative Server-State Rendering:
 * 1. Visits list (V1: GET /api/v1/visits) via useVisits hook.
 * 2. Inquiries list (I2: GET /api/v1/inquiries) via useInquiries hook.
 * 3. Pull-to-refresh & cache invalidation support.
 * 4. Tap visit -> `/activity/visits/:visitId`.
 * 5. Tap inquiry -> `/activity/inquiries/:inquiryId`.
 * 6. Guest sign-in prompt when not authenticated.
 */

import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import {
  Box,
  Button,
  Card,
  Pressable,
  Stack,
  Text,
} from "@/components/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import { useAuthStore } from "@/services/auth";
import {
  getInquiryDetailRoute,
  getVisitDetailRoute,
  ROUTES,
} from "@/navigation/routes";
import { useVisits } from "@/features/visits/hooks/useVisits";
import { useInquiries } from "@/features/inquiries/hooks/useInquiries";
import { useUnreadCount } from "@/features/notifications";
import { SupportEntryCard } from "@/features/support";
import { colors } from "@/theme/tokens";
import type {
  VisitRecord,
  VisitStatus,
} from "@/features/visits/types/visits.types";
import type {
  InquiryRecord,
  InquiryStatus,
} from "@/features/inquiries/types/inquiries.types";

function getVisitBadgeClass(status: VisitStatus): {
  label: string;
  bgStyle: { backgroundColor: string; borderColor: string };
  tone: "primary" | "secondary" | "brand" | "error" | "inverse";
} {
  switch (status) {
    case "CONFIRMED":
      return {
        label: "CONFIRMED",
        bgStyle: {
          backgroundColor: colors.success.light,
          borderColor: colors.success.border,
        },
        tone: "primary",
      };
    case "REQUESTED":
    case "PENDING_CONFIRMATION":
      return {
        label: "PENDING CONFIRMATION",
        bgStyle: {
          backgroundColor: colors.warning.light,
          borderColor: colors.warning.border,
        },
        tone: "primary",
      };
    case "RESCHEDULE_REQUESTED":
    case "RESCHEDULED":
      return {
        label: "RESCHEDULE REQUESTED",
        bgStyle: {
          backgroundColor: colors.info.light,
          borderColor: colors.info.border,
        },
        tone: "primary",
      };
    case "CANCELLED_BY_USER":
    case "CANCELLED_BY_BROKER":
    case "CANCELLED_BY_SYSTEM":
      return {
        label: "CANCELLED",
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        },
        tone: "secondary",
      };
    case "COMPLETED":
      return {
        label: "COMPLETED",
        bgStyle: {
          backgroundColor: colors.brand.light,
          borderColor: colors.brand.primary,
        },
        tone: "primary",
      };
    default:
      return {
        label: status,
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        },
        tone: "secondary",
      };
  }
}

function getInquiryBadgeClass(status: InquiryStatus): {
  label: string;
  bgStyle: { backgroundColor: string; borderColor: string };
  tone: "primary" | "secondary" | "brand" | "error" | "inverse";
} {
  switch (status) {
    case "RESPONDED":
      return {
        label: "RESPONDED",
        bgStyle: {
          backgroundColor: colors.success.light,
          borderColor: colors.success.border,
        },
        tone: "primary",
      };
    case "ACKNOWLEDGED":
      return {
        label: "ACKNOWLEDGED",
        bgStyle: {
          backgroundColor: colors.info.light,
          borderColor: colors.info.border,
        },
        tone: "primary",
      };
    case "SUBMITTED":
      return {
        label: "SUBMITTED",
        bgStyle: {
          backgroundColor: colors.warning.light,
          borderColor: colors.warning.border,
        },
        tone: "primary",
      };
    case "CLOSED":
      return {
        label: "CLOSED",
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        },
        tone: "secondary",
      };
    default:
      return {
        label: status,
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        },
        tone: "secondary",
      };
  }
}

export default function ActivityTab() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === "AUTHENTICATED";

  const [activeTab, setActiveTab] = useState<"VISITS" | "INQUIRIES">("VISITS");

  const {
    visits,
    total: totalVisits,
    isLoading: isVisitsLoading,
    isRefreshing: isVisitsRefreshing,
    error: visitsError,
    errorMessage: visitsErrorMessage,
    refetch: refetchVisits,
    refresh: refreshVisits,
  } = useVisits({ enabled: isAuthenticated });

  const {
    inquiries,
    total: totalInquiries,
    isLoading: isInquiriesLoading,
    isRefreshing: isInquiriesRefreshing,
    error: inquiriesError,
    errorMessage: inquiriesErrorMessage,
    refetch: refetchInquiries,
    refresh: refreshInquiries,
  } = useInquiries({ enabled: isAuthenticated });

  const { unreadCount } = useUnreadCount({ enabled: isAuthenticated });

  function handleSignIn() {
    router.push(ROUTES.AUTH_SIGN_IN as any);
  }

  const isRefreshing = isVisitsRefreshing || isInquiriesRefreshing;

  async function onRefresh() {
    await Promise.all([refreshVisits(), refreshInquiries()]);
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                variant="label"
                tone="brand"
                weight="bold"
                className="tracking-widest uppercase text-[10px]"
              >
                JOURNEYS & VISITS
              </Text>
              <Text variant="h2" tone="primary" weight="bold">
                Activity
              </Text>
            </View>

            {isAuthenticated && (
              <Pressable
                onPress={() => router.push(ROUTES.NOTIFICATIONS as any)}
                accessibilityRole="button"
                accessibilityLabel={`Notifications, ${unreadCount} unread`}
                accessibilityHint="Navigates to Notification Center"
                className="flex-row items-center px-3 py-1.5 rounded-full bg-surface-muted border border-default-border active:opacity-75"
              >
                <Text className="text-sm mr-1">🔔</Text>
                {unreadCount > 0 ? (
                  <View
                    style={{
                      backgroundColor: colors.brand.primary,
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                    }}
                  >
                    <Text
                      variant="caption"
                      tone="inverse"
                      weight="bold"
                      className="text-[10px]"
                    >
                      {unreadCount}
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption" tone="muted" weight="bold" className="text-[11px]">
                    Alerts
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Segmented Control Tabs */}
          {isAuthenticated ? (
            <View
              style={{
                flexDirection: "row",
                marginTop: 12,
                padding: 4,
                borderRadius: 12,
                backgroundColor: "#F1F5F9",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Pressable
                onPress={() => setActiveTab("VISITS")}
                style={[
                  {
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  activeTab === "VISITS"
                    ? {
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                      }
                    : null,
                ]}
              >
                <Text
                  variant="bodySmall"
                  tone={activeTab === "VISITS" ? "primary" : "secondary"}
                  weight={activeTab === "VISITS" ? "bold" : "medium"}
                >
                  Visits ({totalVisits})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("INQUIRIES")}
                style={[
                  {
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  activeTab === "INQUIRIES"
                    ? {
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                      }
                    : null,
                ]}
              >
                <Text
                  variant="bodySmall"
                  tone={activeTab === "INQUIRIES" ? "primary" : "secondary"}
                  weight={activeTab === "INQUIRIES" ? "bold" : "medium"}
                >
                  Inquiries ({totalInquiries})
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Content */}
        {!isAuthenticated ? (
          <View
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
          >
            <EmptyState
              title="Sign In to Track Activity"
              description="Monitor property visit appointments, direct owner chats, and digital lease agreements in one place."
              actionLabel="Sign In with Mobile"
              onAction={handleSignIn}
            />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
          >
            {activeTab === "VISITS" ? (
              /* Visits Stream */
              isVisitsLoading ? (
                <View style={{ gap: 16 }}>
                  <Skeleton width="100%" height={120} borderRadius={12} />
                  <Skeleton width="100%" height={120} borderRadius={12} />
                  <Skeleton width="100%" height={120} borderRadius={12} />
                </View>
              ) : visitsError ? (
                <View style={{ paddingVertical: 48 }}>
                  <ErrorState
                    title="Unable to Load Visits"
                    message={
                      visitsErrorMessage || "Could not retrieve your visits."
                    }
                    onRetry={refetchVisits}
                    retryLabel="Try Again"
                  />
                </View>
              ) : visits.length === 0 ? (
                <View style={{ paddingVertical: 48 }}>
                  <EmptyState
                    title="No Scheduled Visits"
                    description="You have not requested any private visits yet. Browse verified residences on Discover to schedule a direct viewing."
                    actionLabel="Discover Homes"
                    onAction={() => router.push(ROUTES.DISCOVER as any)}
                  />
                </View>
              ) : (
                <Stack spacing={4}>
                  {visits.map((visit) => {
                    const badge = getVisitBadgeClass(visit.status);
                    const dateDisplay = new Date(
                      visit.confirmedStartAt || visit.requestedStartAt,
                    ).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const timeDisplay = `${new Date(visit.confirmedStartAt || visit.requestedStartAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(visit.confirmedEndAt || visit.requestedEndAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

                    return (
                      <Pressable
                        key={visit.id}
                        onPress={() =>
                          router.push(getVisitDetailRoute(visit.id) as any)
                        }
                      >
                        <Card
                          variant="outlined"
                          padding="large"
                          radius="large"
                          style={{
                            borderColor: "#E2E8F0",
                            backgroundColor: "#FFFFFF",
                          }}
                        >
                          <Stack spacing={3}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <View
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  borderRadius: 9999,
                                  borderWidth: 1,
                                  backgroundColor:
                                    badge.bgStyle.backgroundColor,
                                  borderColor: badge.bgStyle.borderColor,
                                }}
                              >
                                <Text
                                  variant="caption"
                                  tone={badge.tone}
                                  weight="bold"
                                  style={{ fontSize: 10 }}
                                >
                                  {badge.label}
                                </Text>
                              </View>
                              <Text variant="caption" tone="secondary">
                                {dateDisplay}
                              </Text>
                            </View>

                            <Stack spacing={1}>
                              <Text
                                variant="title"
                                tone="primary"
                                weight="bold"
                              >
                                {visit.listingTitle}
                              </Text>
                              <Text variant="bodySmall" tone="secondary">
                                {visit.listingLocalityName},{" "}
                                {visit.listingCityName}
                              </Text>
                            </Stack>

                            <View
                              style={{
                                paddingTop: 8,
                                borderTopWidth: 1,
                                borderTopColor: "#F1F5F9",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Text
                                variant="caption"
                                tone="brand"
                                weight="semibold"
                              >
                                🕒 {timeDisplay}
                              </Text>
                              <Text
                                variant="caption"
                                tone="brand"
                                weight="bold"
                              >
                                Manage →
                              </Text>
                            </View>
                          </Stack>
                        </Card>
                      </Pressable>
                    );
                  })}
                </Stack>
              )
            ) : /* Inquiries Stream */
            isInquiriesLoading ? (
              <View style={{ gap: 16 }}>
                <Skeleton width="100%" height={100} borderRadius={12} />
                <Skeleton width="100%" height={100} borderRadius={12} />
              </View>
            ) : inquiriesError ? (
              <View style={{ paddingVertical: 48 }}>
                <ErrorState
                  title="Unable to Load Inquiries"
                  message={
                    inquiriesErrorMessage ||
                    "Could not retrieve your inquiries."
                  }
                  onRetry={refetchInquiries}
                  retryLabel="Try Again"
                />
              </View>
            ) : inquiries.length === 0 ? (
              <View style={{ paddingVertical: 48 }}>
                <EmptyState
                  title="No Property Inquiries"
                  description="You have not submitted questions for any residences yet. Inquire directly on any property detail page."
                  actionLabel="Discover Homes"
                  onAction={() => router.push(ROUTES.DISCOVER as any)}
                />
              </View>
            ) : (
              <Stack spacing={4}>
                {inquiries.map((inq) => {
                  const badge = getInquiryBadgeClass(inq.status);
                  return (
                    <Pressable
                      key={inq.id}
                      onPress={() =>
                        router.push(getInquiryDetailRoute(inq.id) as any)
                      }
                    >
                      <Card
                        variant="outlined"
                        padding="large"
                        radius="large"
                        style={{
                          borderColor: "#E2E8F0",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <Stack spacing={3}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <View
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 9999,
                                borderWidth: 1,
                                backgroundColor: badge.bgStyle.backgroundColor,
                                borderColor: badge.bgStyle.borderColor,
                              }}
                            >
                              <Text
                                variant="caption"
                                tone={badge.tone}
                                weight="bold"
                                style={{ fontSize: 10 }}
                              >
                                {badge.label}
                              </Text>
                            </View>
                            <Text variant="caption" tone="secondary">
                              {new Date(inq.createdAt).toLocaleDateString()}
                            </Text>
                          </View>

                          <Stack spacing={1}>
                            <Text variant="title" tone="primary" weight="bold">
                              {inq.listingTitle}
                            </Text>
                            <Text variant="bodySmall" tone="secondary">
                              {inq.listingLocalityName}, {inq.listingCityName}
                            </Text>
                          </Stack>

                          <Text
                            variant="bodySmall"
                            tone="secondary"
                            numberOfLines={2}
                            style={{ paddingTop: 4, fontStyle: "italic" }}
                          >
                            "{inq.message}"
                          </Text>

                          <View
                            style={{
                              paddingTop: 8,
                              borderTopWidth: 1,
                              borderTopColor: "#F1F5F9",
                              flexDirection: "row",
                              justifyContent: "flex-end",
                            }}
                          >
                            <Text variant="caption" tone="brand" weight="bold">
                              View Details →
                            </Text>
                          </View>
                        </Stack>
                      </Card>
                    </Pressable>
                  );
                })}
              </Stack>
            )}

            {/* Support Concierge Access */}
            <View style={{ paddingTop: 16, paddingBottom: 24 }}>
              <SupportEntryCard
                title={
                  activeTab === "VISITS"
                    ? "Need Help with a Tour?"
                    : "Need Inquiry Assistance?"
                }
                description="Get direct help with scheduled visits, representative communications, or account assistance."
                category={activeTab === "VISITS" ? "VISIT_HELP" : "INQUIRY_HELP"}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </AppContainer>
  );
}
