/**
 * Visit Detail Screen
 *
 * Route: `/activity/visits/:visitId`
 *
 * Enforces:
 * 1. Authoritative fetch by visitId (GET /api/v1/visits/:visitId).
 * 2. Strict RFC 4122 UUID validation.
 * 3. Explicit cancellation with confirmation, reason, and single-flight lock (POST /api/v1/visits/:visitId/cancel).
 * 4. Rescheduling with server-fetched slots and single-flight lock (POST /api/v1/visits/:visitId/reschedule).
 * 5. Server response controls final state (no optimistic success).
 * 6. Luxury/calm editorial visual language.
 */

import React, { useState } from "react";
import { Alert, Modal, ScrollView, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
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
import {
  getListingDetailRoute,
  isValidUuid,
  ROUTES,
} from "@/navigation/routes";
import { useVisitDetail } from "@/features/visits/hooks/useVisitDetail";
import { useVisitMutations } from "@/features/visits/hooks/useVisitMutations";
import { useVisitAvailability } from "@/features/visits/hooks/useVisitAvailability";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { colors } from "@/theme/tokens";
import type {
  VisitAvailabilitySlot,
  VisitStatus,
} from "@/features/visits/types/visits.types";

function getStatusBadgeConfig(status: VisitStatus): {
  label: string;
  bgStyle: { backgroundColor: string; borderColor: string };
  textTone: "primary" | "secondary" | "brand" | "error" | "inverse";
} {
  switch (status) {
    case "CONFIRMED":
      return {
        label: "CONFIRMED",
        bgStyle: {
          backgroundColor: colors.success.light,
          borderColor: colors.success.border,
        },
        textTone: "primary",
      };
    case "REQUESTED":
    case "PENDING_CONFIRMATION":
      return {
        label: "PENDING CONFIRMATION",
        bgStyle: {
          backgroundColor: colors.warning.light,
          borderColor: colors.warning.border,
        },
        textTone: "primary",
      };
    case "RESCHEDULE_REQUESTED":
    case "RESCHEDULED":
      return {
        label: "RESCHEDULE REQUESTED",
        bgStyle: {
          backgroundColor: colors.info.light,
          borderColor: colors.info.border,
        },
        textTone: "primary",
      };
    case "CANCELLED_BY_USER":
      return {
        label: "CANCELLED BY YOU",
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        },
        textTone: "secondary",
      };
    case "CANCELLED_BY_BROKER":
    case "CANCELLED_BY_SYSTEM":
    case "REJECTED":
      return {
        label: "DECLINED / CANCELLED",
        bgStyle: {
          backgroundColor: colors.error.light,
          borderColor: colors.error.border,
        },
        textTone: "error",
      };
    case "COMPLETED":
      return {
        label: "COMPLETED",
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.strongBorder,
        },
        textTone: "primary",
      };
    case "EXPIRED":
      return {
        label: "EXPIRED",
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        },
        textTone: "secondary",
      };
    default:
      return {
        label: status,
        bgStyle: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        },
        textTone: "secondary",
      };
  }
}

export default function VisitDetailScreen() {
  const params = useLocalSearchParams<{ visitId?: string }>();
  const visitId = params.visitId;

  const isIdValid = isValidUuid(visitId);

  const {
    visit,
    isLoading,
    isRefreshing,
    isInvalidId,
    error,
    errorMessage,
    refetch,
  } = useVisitDetail(visitId, { enabled: isIdValid });

  const {
    isCancelling,
    isRescheduling,
    mutationError,
    clearError,
    handleCancelVisit,
    handleRescheduleVisit,
  } = useVisitMutations();

  // Cancel Modal State
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule Modal State
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] =
    useState(false);
  const [selectedSlot, setSelectedSlot] =
    useState<VisitAvailabilitySlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");

  const { availability, isLoading: isAvailabilityLoading } =
    useVisitAvailability(visit?.listingId, {
      enabled: isRescheduleModalVisible && !!visit?.listingId,
    });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.ACTIVITY as any);
    }
  }

  async function onConfirmCancel() {
    if (!visitId) return;
    try {
      await handleCancelVisit(visitId, {
        reason: cancelReason.trim() || undefined,
      });
      trackEvent(ANALYTICS_EVENTS.VISIT_CANCELLED, { visitId });
      setIsCancelModalVisible(false);
      setCancelReason("");
      refetch();
    } catch {
      // Error in mutationError
    }
  }

  async function onConfirmReschedule() {
    if (!visitId || !selectedSlot) return;
    try {
      await handleRescheduleVisit(visitId, {
        requestedStartAt: selectedSlot.startAt,
        requestedEndAt: selectedSlot.endAt,
        reason: rescheduleReason.trim() || undefined,
      });
      trackEvent(ANALYTICS_EVENTS.VISIT_RESCHEDULE_REQUESTED, { visitId });
      setIsRescheduleModalVisible(false);
      setSelectedSlot(null);
      setRescheduleReason("");
      refetch();
    } catch {
      // Error in mutationError
    }
  }

  // Handle invalid UUID
  if (isInvalidId || !isIdValid) {
    return (
      <AppContainer edges={["top"]}>
        <View className="flex-1 justify-center px-6">
          <ErrorState
            title="Invalid Visit Identifier"
            message="The visit appointment identifier is missing or malformed."
            onRetry={handleBack}
            retryLabel="Return to Activity"
          />
        </View>
      </AppContainer>
    );
  }

  const badge = visit ? getStatusBadgeConfig(visit.status) : null;

  return (
    <AppContainer edges={["top", "bottom"]}>
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {/* Navigation Bar */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.subtleBorder,
            zIndex: 10,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={handleBack}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 9999,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.defaultBorder,
            }}
          >
            <Text variant="bodySmall" tone="primary" weight="semibold">
              ← Back
            </Text>
          </Pressable>

          <Text variant="title" tone="primary" weight="bold">
            Visit Appointment
          </Text>

          <View style={{ width: 32 }} />
        </View>

        {/* Content Body */}
        {isLoading ? (
          <View className="p-6 space-y-4">
            <Skeleton width="100%" height={160} borderRadius={12} />
            <Skeleton width="60%" height={24} borderRadius={4} />
            <Skeleton width="80%" height={18} borderRadius={4} />
            <Skeleton width="100%" height={100} borderRadius={8} />
          </View>
        ) : error || !visit ? (
          <View className="flex-1 justify-center px-6">
            <ErrorState
              title="Visit Not Found"
              message={
                errorMessage ||
                "This visit could not be found or you do not have permission to view it."
              }
              onRetry={refetch}
              retryLabel="Retry"
            />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, paddingBottom: 24 }}
          >
            {/* Mutation error banner if any */}
            {mutationError ? (
              <View className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200">
                <Text variant="caption" tone="error" weight="semibold">
                  {mutationError}
                </Text>
              </View>
            ) : null}

            {/* Status Card Header */}
            <Card
              variant="outlined"
              padding="large"
              radius="large"
              className="mb-6"
            >
              <Stack spacing={4}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    variant="caption"
                    tone="muted"
                    style={{ textTransform: "uppercase", letterSpacing: 1.5 }}
                  >
                    Status
                  </Text>
                  {badge ? (
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 9999,
                        borderWidth: 1,
                        ...badge.bgStyle,
                      }}
                    >
                      <Text
                        variant="caption"
                        tone={badge.textTone}
                        weight="bold"
                      >
                        {badge.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Property Brief */}
                <Pressable
                  onPress={() =>
                    router.push(getListingDetailRoute(visit.listingId) as any)
                  }
                  className="flex-row items-center space-x-3 bg-surface-muted p-3 rounded-xl border border-subtle-border active:opacity-80"
                >
                  {visit.listingCoverImageUrl ? (
                    <Image
                      source={{ uri: visit.listingCoverImageUrl }}
                      style={{ width: 64, height: 64, borderRadius: 8 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-16 h-16 rounded-lg bg-neutral-200 items-center justify-center">
                      <Text variant="caption" tone="muted">
                        No Photo
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text
                      variant="body"
                      tone="primary"
                      weight="bold"
                      numberOfLines={1}
                    >
                      {visit.listingTitle}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {visit.listingLocalityName}, {visit.listingCityName}
                    </Text>
                    <Text
                      variant="caption"
                      tone="brand"
                      weight="semibold"
                      className="mt-1"
                    >
                      View Residence Details →
                    </Text>
                  </View>
                </Pressable>

                {/* Scheduled Times */}
                <View className="space-y-3">
                  <View className="p-3 rounded-lg bg-surface-muted border border-subtle-border">
                    <Text variant="caption" tone="muted" className="uppercase">
                      {visit.confirmedStartAt
                        ? "Confirmed Time"
                        : "Requested Timeslot"}
                    </Text>
                    <Text variant="body" tone="primary" weight="bold">
                      {new Date(
                        visit.confirmedStartAt || visit.requestedStartAt,
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <Text variant="bodySmall" tone="brand" weight="semibold">
                      {new Date(
                        visit.confirmedStartAt || visit.requestedStartAt,
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(
                        visit.confirmedEndAt || visit.requestedEndAt,
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  {visit.requestNote ? (
                    <View className="p-3 rounded-lg bg-surface-muted border border-subtle-border">
                      <Text
                        variant="caption"
                        tone="muted"
                        className="uppercase"
                      >
                        Your Request Note
                      </Text>
                      <Text variant="bodySmall" tone="secondary">
                        {visit.requestNote}
                      </Text>
                    </View>
                  ) : null}

                  {visit.cancellationReason ? (
                    <View className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <Text
                        variant="caption"
                        tone="error"
                        weight="semibold"
                        className="uppercase"
                      >
                        Cancellation Note
                      </Text>
                      <Text variant="bodySmall" tone="error">
                        {visit.cancellationReason}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Appointment Metadata */}
                <View className="pt-2 border-t border-subtle-border flex-row justify-between">
                  <Text variant="caption" tone="muted">
                    Reference ID: {visit.id.slice(0, 18)}...
                  </Text>
                  <Text variant="caption" tone="muted">
                    Created: {new Date(visit.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </Stack>
            </Card>

            {/* Visit Coordination Information */}
            <Card
              variant="outlined"
              padding="large"
              radius="large"
              className="mb-4"
            >
              <Stack spacing={3}>
                <Text variant="bodySmall" tone="primary" weight="bold">
                  Visit Coordination & Direct Viewing
                </Text>
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <Text variant="caption" tone="brand" weight="bold">
                      📍 Location:
                    </Text>
                    <Text variant="caption" tone="primary" style={{ flex: 1 }}>
                      {visit.listingTitle}, {visit.listingLocalityName},{" "}
                      {visit.listingCityName}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <Text variant="caption" tone="brand" weight="bold">
                      🕒 Arrival:
                    </Text>
                    <Text
                      variant="caption"
                      tone="secondary"
                      style={{ flex: 1 }}
                    >
                      Please arrive 5 to 10 minutes prior to your scheduled
                      time. The verified homeowner coordinates viewing access
                      directly.
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <Text variant="caption" tone="brand" weight="bold">
                      🛡️ Guarantee:
                    </Text>
                    <Text
                      variant="caption"
                      tone="secondary"
                      style={{ flex: 1 }}
                    >
                      Zero Brokerage certified private visit. Direct viewing
                      with no broker fee or intermediary interference.
                    </Text>
                  </View>
                </View>

                {/* Authorized Communication: Follow-up inquiry to property owner */}
                <View
                  style={{
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.subtleBorder,
                  }}
                >
                  <Button
                    label="Send Message to Owner"
                    variant="secondary"
                    size="small"
                    fullWidth
                    onPress={() => {
                      trackEvent(ANALYTICS_EVENTS.CONTACT_ACTION_INITIATED, {
                        visitId: visit.id,
                        listingId: visit.listingId,
                        type: "follow_up_inquiry",
                      });
                      router.push(
                        getListingDetailRoute(visit.listingId) as any,
                      );
                    }}
                  />
                </View>
              </Stack>
            </Card>

            {/* Zero Brokerage Guidance */}
            <Card variant="outlined" padding="large" radius="large">
              <Stack spacing={2}>
                <Text variant="bodySmall" tone="primary" weight="bold">
                  Zero Brokerage Code of Conduct
                </Text>
                <Text variant="caption" tone="secondary" className="leading-5">
                  Direct visits are private viewings arranged exclusively for
                  verified users. No broker or agent will accompany this visit.
                  If your plans change, please cancel or reschedule promptly.
                </Text>
              </Stack>
            </Card>
          </ScrollView>
        )}

        {/* Action Footer */}
        {visit && (visit.canCancel || visit.canReschedule) ? (
          <View
            style={{
              flexShrink: 0,
              padding: 16,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.defaultBorder,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              elevation: 4,
            }}
          >
            {visit.canCancel ? (
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel Appointment"
                  variant="secondary"
                  size="large"
                  fullWidth
                  disabled={isCancelling}
                  onPress={() => {
                    clearError();
                    setIsCancelModalVisible(true);
                  }}
                />
              </View>
            ) : null}

            {visit.canReschedule ? (
              <View style={{ flex: 1 }}>
                <Button
                  label="Reschedule"
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={isRescheduling}
                  onPress={() => {
                    clearError();
                    setIsRescheduleModalVisible(true);
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Cancel Confirmation Modal */}
        <Modal
          visible={isCancelModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsCancelModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-surface rounded-t-2xl p-6 border-t border-default-border">
              <Text
                variant="title"
                tone="primary"
                weight="bold"
                className="mb-2"
              >
                Cancel Visit Appointment
              </Text>
              <Text variant="bodySmall" tone="secondary" className="mb-4">
                Are you sure you want to cancel this visit? This action cannot
                be undone.
              </Text>

              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Reason for cancellation (optional, max 300 chars)..."
                placeholderTextColor="#9ca3af"
                maxLength={300}
                className="p-3 border border-default-border rounded-xl bg-surface-muted text-foreground text-sm mb-4"
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Keep Visit"
                    variant="secondary"
                    size="medium"
                    fullWidth
                    disabled={isCancelling}
                    onPress={() => setIsCancelModalVisible(false)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={isCancelling ? "Cancelling..." : "Confirm Cancel"}
                    variant="primary"
                    size="medium"
                    fullWidth
                    disabled={isCancelling}
                    onPress={onConfirmCancel}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Reschedule Modal */}
        <Modal
          visible={isRescheduleModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsRescheduleModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-surface rounded-t-2xl p-6 max-h-[80%] border-t border-default-border">
              <Text
                variant="title"
                tone="primary"
                weight="bold"
                className="mb-2"
              >
                Reschedule Visit
              </Text>
              <Text variant="bodySmall" tone="secondary" className="mb-3">
                Select an alternative slot from the verified owner's calendar.
              </Text>

              {isAvailabilityLoading ? (
                <View className="p-8 items-center justify-center">
                  <Skeleton width="100%" height={50} borderRadius={8} />
                </View>
              ) : (
                <ScrollView className="max-h-[300px] mb-4">
                  {(availability?.slots || [])
                    .filter((s) => s.isAvailable)
                    .map((slot) => {
                      const isSelected = selectedSlot?.slotId === slot.slotId;
                      const dateStr = new Date(slot.startAt).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      );
                      const timeStr = `${new Date(slot.startAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(slot.endAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

                      return (
                        <Pressable
                          key={slot.slotId}
                          onPress={() => setSelectedSlot(slot)}
                          style={{
                            padding: 12,
                            marginBottom: 8,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: isSelected
                              ? colors.brand.DEFAULT
                              : colors.defaultBorder,
                            backgroundColor: isSelected
                              ? colors.brand.light
                              : colors.surfaceMuted,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <View>
                            <Text
                              variant="bodySmall"
                              tone="primary"
                              weight="bold"
                            >
                              {dateStr}
                            </Text>
                            <Text variant="caption" tone="brand">
                              {timeStr}
                            </Text>
                          </View>
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              borderWidth: 1.5,
                              borderColor: isSelected
                                ? colors.brand.DEFAULT
                                : "#D1D5DB",
                              backgroundColor: isSelected
                                ? colors.brand.DEFAULT
                                : "transparent",
                            }}
                          />
                        </Pressable>
                      );
                    })}
                </ScrollView>
              )}

              <TextInput
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                placeholder="Reason for reschedule (optional)..."
                placeholderTextColor="#9ca3af"
                maxLength={300}
                className="p-3 border border-default-border rounded-xl bg-surface-muted text-foreground text-sm mb-4"
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    size="medium"
                    fullWidth
                    disabled={isRescheduling}
                    onPress={() => setIsRescheduleModalVisible(false)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={
                      isRescheduling ? "Submitting..." : "Confirm Reschedule"
                    }
                    variant="primary"
                    size="medium"
                    fullWidth
                    disabled={isRescheduling || !selectedSlot}
                    onPress={onConfirmReschedule}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppContainer>
  );
}
