/**
 * Schedule Private Visit Screen
 *
 * Route: `/listing/:id/schedule`
 *
 * Rules:
 * 1. Strictly server-controlled availability (never locally generate slots).
 * 2. Never assume POST success means CONFIRMED (actual status from backend is REQUESTED).
 * 3. Handle conflict (409), invalid slot (422), unauthenticated (401).
 * 4. Single-flight submission protection.
 * 5. On success, navigate to authoritative visit detail.
 */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  View,
} from "react-native";
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
  getVisitDetailRoute,
  isValidUuid,
  ROUTES,
} from "@/navigation/routes";
import { useVisitAvailability } from "@/features/visits/hooks/useVisitAvailability";
import { useVisitMutations } from "@/features/visits/hooks/useVisitMutations";
import { useAuthStore } from "@/services/auth/auth-store";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { colors } from "@/theme/tokens";
import type { VisitAvailabilitySlot } from "@/features/visits/types/visits.types";

export default function ScheduleVisitScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = params.id;

  const isIdValid = isValidUuid(listingId);
  const authStatus = useAuthStore((s) => s.status);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  const {
    availability,
    isLoading: isAvailabilityLoading,
    error: availabilityError,
    errorMessage: availabilityErrorMessage,
    refetch: refetchAvailability,
  } = useVisitAvailability(listingId, {
    enabled: isIdValid && isAuthenticated,
  });

  const { isRequesting, mutationError, clearError, handleRequestVisit } =
    useVisitMutations();

  const [selectedSlot, setSelectedSlot] =
    useState<VisitAvailabilitySlot | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [step, setStep] = useState<"SLOT_SELECTION" | "REVIEW">(
    "SLOT_SELECTION",
  );

  function handleBack() {
    if (step === "REVIEW") {
      setStep("SLOT_SELECTION");
      return;
    }
    if (listingId && isIdValid) {
      router.replace(getListingDetailRoute(listingId) as any);
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  // Group availability slots by date
  const groupedSlots = useMemo(() => {
    if (!availability?.slots) return {};
    const groups: Record<string, VisitAvailabilitySlot[]> = {};

    for (const slot of availability.slots) {
      const dateKey = new Date(slot.startAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    }
    return groups;
  }, [availability?.slots]);

  const dateKeys = useMemo(() => Object.keys(groupedSlots), [groupedSlots]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Select initial date when available and emit availability viewed
  React.useEffect(() => {
    if (dateKeys.length > 0 && !selectedDate) {
      setSelectedDate(dateKeys[0]);
    }
  }, [dateKeys, selectedDate]);

  React.useEffect(() => {
    if (availability && listingId) {
      trackEvent(ANALYTICS_EVENTS.VISIT_AVAILABILITY_VIEWED, {
        listingId,
        slotCount: availability.slots?.length ?? 0,
      });
    }
  }, [availability, listingId]);

  async function handleSubmitRequest() {
    if (!listingId || !selectedSlot) return;

    try {
      trackEvent(ANALYTICS_EVENTS.VISIT_REQUEST_SUBMITTED, {
        listingId,
        slotId: selectedSlot.slotId,
      });

      const record = await handleRequestVisit({
        listingId,
        requestedStartAt: selectedSlot.startAt,
        requestedEndAt: selectedSlot.endAt,
        requestNote: requestNote.trim() || undefined,
      });

      if (record) {
        trackEvent(ANALYTICS_EVENTS.VISIT_REQUEST_CONFIRMED, {
          visitId: record.id,
          listingId: record.listingId,
          status: record.status,
        });

        // Navigate directly to the newly created visit detail
        router.replace(getVisitDetailRoute(record.id) as any);
      }
    } catch {
      // Error handled and captured in mutationError
    }
  }

  // Handle invalid UUID
  if (!isIdValid) {
    return (
      <AppContainer>
        <View className="flex-1 justify-center px-5">
          <ErrorState
            title="Invalid Property Link"
            message="The property link for visit scheduling is not valid."
            onRetry={handleBack}
            retryLabel="Return to Discover"
          />
        </View>
      </AppContainer>
    );
  }

  // Handle unauthenticated user
  if (!isAuthenticated) {
    return (
      <AppContainer edges={["top", "bottom"]}>
        <View className="flex-1 bg-surface px-6 justify-center">
          <Card variant="elevated" padding="large" radius="large">
            <Stack spacing={4} className="items-center text-center">
              <Text variant="h2" tone="primary" weight="bold">
                Private Visit Access
              </Text>
              <Text variant="body" tone="secondary" className="text-center">
                To coordinate confidential private viewings directly with
                verified homeowners, please sign in to your Zero Brokerage
                account.
              </Text>
              <Button
                label="Sign In to Continue"
                variant="primary"
                size="large"
                fullWidth
                onPress={() => router.push(ROUTES.AUTH_SIGN_IN as any)}
              />
              <Button
                label="Return"
                variant="tertiary"
                size="small"
                onPress={handleBack}
              />
            </Stack>
          </Card>
        </View>
      </AppContainer>
    );
  }

  const existingVisitId =
    availability?.visitEligibility?.reason === "EXISTING_ACTIVE_VISIT"
      ? availability.visitEligibility.existingVisitId
      : null;

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
            {step === "REVIEW" ? "Review Appointment" : "Select Visit Slot"}
          </Text>

          <View style={{ width: 32 }} />
        </View>

        {/* Content Body */}
        {isAvailabilityLoading ? (
          <View className="p-6 space-y-4">
            <Skeleton width="60%" height={24} borderRadius={4} />
            <Skeleton width="100%" height={50} borderRadius={8} />
            <Skeleton width="100%" height={140} borderRadius={12} />
          </View>
        ) : availabilityError ? (
          <View className="flex-1 justify-center px-6">
            <ErrorState
              title="Availability Unavailable"
              message={
                availabilityErrorMessage ||
                "Unable to retrieve verified visit slots for this property."
              }
              onRetry={refetchAvailability}
              retryLabel="Try Again"
            />
          </View>
        ) : existingVisitId ? (
          <View className="flex-1 justify-center px-6">
            <Card variant="outlined" padding="large" radius="large">
              <Stack spacing={4} className="items-center text-center">
                <Text variant="h2" tone="brand" weight="bold">
                  Existing Visit Active
                </Text>
                <Text variant="body" tone="secondary" className="text-center">
                  You already have an active visit request or appointment for
                  this property. Multiple concurrent requests for the same
                  residence are not permitted.
                </Text>
                <Button
                  label="View Existing Visit"
                  variant="primary"
                  size="large"
                  fullWidth
                  onPress={() =>
                    router.replace(getVisitDetailRoute(existingVisitId) as any)
                  }
                />
              </Stack>
            </Card>
          </View>
        ) : step === "SLOT_SELECTION" ? (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, paddingBottom: 24 }}
          >
            {/* Property Preview Header */}
            {availability?.listing ? (
              <View className="mb-6 p-4 rounded-xl bg-surface-muted border border-default-border flex-row items-center space-x-3">
                <View className="flex-1">
                  <Text
                    variant="caption"
                    tone="muted"
                    className="uppercase tracking-wider"
                  >
                    Viewing Property
                  </Text>
                  <Text
                    variant="body"
                    tone="primary"
                    weight="bold"
                    numberOfLines={1}
                  >
                    {availability.listing.title}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {availability.listing.localityName},{" "}
                    {availability.listing.cityName}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Step Instructions */}
            <Text variant="title" tone="primary" weight="bold" className="mb-2">
              Available Dates
            </Text>
            <Text variant="bodySmall" tone="secondary" className="mb-4">
              Select an available viewing date and time. Appointments are
              coordinated directly with the owner.
            </Text>

            {/* Date Selector Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 8 }}
              className="mb-6"
            >
              {dateKeys.map((dateStr) => {
                const isSelected = selectedDate === dateStr;
                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => {
                      setSelectedDate(dateStr);
                      setSelectedSlot(null);
                    }}
                    style={{
                      marginRight: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? colors.brand.DEFAULT
                        : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? colors.brand.DEFAULT
                        : colors.defaultBorder,
                    }}
                  >
                    <Text
                      variant="bodySmall"
                      tone={isSelected ? "inverse" : "primary"}
                      weight="bold"
                    >
                      {dateStr}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Available Time Slots for Selected Date */}
            <Text variant="title" tone="primary" weight="bold" className="mb-3">
              Available Timeslots (Asia/Kolkata)
            </Text>

            <View>
              {(groupedSlots[selectedDate] || []).map((slot) => {
                const isSelected = selectedSlot?.slotId === slot.slotId;
                const startTime = new Date(slot.startAt).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                const endTime = new Date(slot.endAt).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );

                if (!slot.isAvailable) {
                  return (
                    <View
                      key={slot.slotId}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: colors.surfaceMuted,
                        borderWidth: 1,
                        borderColor: colors.defaultBorder,
                        opacity: 0.6,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <Text variant="body" tone="muted">
                        {startTime} – {endTime}
                      </Text>
                      <Text variant="caption" tone="muted" weight="semibold">
                        Unavailable
                      </Text>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={slot.slotId}
                    onPress={() => {
                      setSelectedSlot(slot);
                      if (listingId) {
                        trackEvent(ANALYTICS_EVENTS.VISIT_SLOT_SELECTED, {
                          listingId,
                          slotId: slot.slotId,
                        });
                      }
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? colors.brand.DEFAULT
                        : colors.defaultBorder,
                      backgroundColor: isSelected
                        ? colors.brand.light
                        : colors.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <View>
                      <Text
                        variant="body"
                        tone={isSelected ? "brand" : "primary"}
                        weight={isSelected ? "bold" : "medium"}
                      >
                        {startTime} – {endTime}
                      </Text>
                      <Text variant="caption" tone="secondary">
                        Private 1-on-1 Viewing
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: isSelected
                          ? colors.brand.DEFAULT
                          : colors.defaultBorder,
                        backgroundColor: isSelected
                          ? colors.brand.DEFAULT
                          : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected ? (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.inverseContent,
                          }}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Optional Request Note */}
            <View className="mt-6">
              <Text
                variant="bodySmall"
                tone="primary"
                weight="semibold"
                className="mb-2"
              >
                Special Requests or Notes (Optional)
              </Text>
              <TextInput
                value={requestNote}
                onChangeText={setRequestNote}
                placeholder="e.g. Inquiring regarding parking access or specific rooms..."
                placeholderTextColor="#9ca3af"
                maxLength={500}
                multiline
                numberOfLines={3}
                className="p-3 border border-default-border rounded-xl bg-surface-muted text-foreground text-sm min-h-[80px]"
              />
              <Text variant="caption" tone="muted" className="mt-1 text-right">
                {requestNote.length} / 500
              </Text>
            </View>
          </ScrollView>
        ) : (
          /* Step 2: REVIEW */
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, paddingBottom: 24 }}
          >
            {mutationError ? (
              <View className="p-4 mb-4 rounded-xl bg-red-50 border border-red-200">
                <Text variant="bodySmall" tone="error" weight="semibold">
                  {mutationError}
                </Text>
              </View>
            ) : null}

            <Card
              variant="outlined"
              padding="large"
              radius="large"
              className="mb-6"
            >
              <Stack spacing={4}>
                <Text variant="title" tone="primary" weight="bold">
                  Appointment Summary
                </Text>

                <View className="p-3 rounded-lg bg-surface-muted border border-subtle-border">
                  <Text variant="caption" tone="muted">
                    Property
                  </Text>
                  <Text variant="body" tone="primary" weight="bold">
                    {availability?.listing?.title}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {availability?.listing?.localityName},{" "}
                    {availability?.listing?.cityName}
                  </Text>
                </View>

                {selectedSlot ? (
                  <View className="p-3 rounded-lg bg-surface-muted border border-subtle-border">
                    <Text variant="caption" tone="muted">
                      Requested Date & Time
                    </Text>
                    <Text variant="body" tone="primary" weight="bold">
                      {new Date(selectedSlot.startAt).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </Text>
                    <Text variant="bodySmall" tone="brand" weight="semibold">
                      {new Date(selectedSlot.startAt).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}{" "}
                      –{" "}
                      {new Date(selectedSlot.endAt).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </Text>
                  </View>
                ) : null}

                {requestNote ? (
                  <View className="p-3 rounded-lg bg-surface-muted border border-subtle-border">
                    <Text variant="caption" tone="muted">
                      Your Note
                    </Text>
                    <Text variant="bodySmall" tone="secondary">
                      {requestNote}
                    </Text>
                  </View>
                ) : null}

                <View className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Text variant="caption" tone="primary" weight="medium">
                    Notice: Submission requests the visit slot from the
                    homeowner. The appointment status will be set to REQUESTED
                    until verified by the property owner.
                  </Text>
                </View>
              </Stack>
            </Card>
          </ScrollView>
        )}

        {/* Sticky Action Footer */}
        {!isAvailabilityLoading && !availabilityError && !existingVisitId ? (
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
            {step === "SLOT_SELECTION" ? (
              <Button
                label="Review Appointment"
                variant="primary"
                size="large"
                fullWidth
                disabled={!selectedSlot}
                onPress={() => {
                  clearError();
                  setStep("REVIEW");
                }}
              />
            ) : (
              <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
                <View style={{ width: 100 }}>
                  <Button
                    label="Back"
                    variant="secondary"
                    size="large"
                    fullWidth
                    disabled={isRequesting}
                    onPress={() => setStep("SLOT_SELECTION")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Request Private Visit"
                    loading={isRequesting}
                    loadingLabel="Submitting..."
                    variant="primary"
                    size="large"
                    fullWidth
                    disabled={isRequesting}
                    onPress={handleSubmitRequest}
                  />
                </View>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </AppContainer>
  );
}
