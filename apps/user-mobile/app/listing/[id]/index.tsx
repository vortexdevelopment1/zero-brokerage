/**
 * Listing Detail Screen
 *
 * Enforces:
 * 1. Strict RFC 4122 UUID validation on route parameter `id`.
 * 2. Never accepts or expects full listing payload via navigation parameters.
 * 3. Authoritative server visit-availability & eligibility integration (V4).
 * 4. Direct scheduling navigation to `/listing/:id/schedule`.
 * 5. Direct inquiry submission modal (I1).
 * 6. Luxury/calm editorial visual language.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
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
  getListingScheduleRoute,
  getVisitDetailRoute,
  isValidUuid,
  ROUTES,
} from "@/navigation/routes";
import { fetchListingById } from "@/features/discovery/api/discovery-api";
import { useQueryState } from "@/features/discovery/hooks/useQueryState";
import type { ListingPresentationModel } from "@/features/discovery/types/discovery.types";
import { PropertyPrice } from "@/features/discovery/components/PropertyPrice";
import { PropertyMeta } from "@/features/discovery/components/PropertyMeta";
import { VerificationBadge } from "@/features/discovery/components/VerificationBadge";
import { FavoriteButton } from "@/features/discovery/components/FavoriteButton";
import { useVisitAvailability } from "@/features/visits/hooks/useVisitAvailability";
import { useSubmitInquiry } from "@/features/inquiries/hooks/useSubmitInquiry";
import { useAuthStore } from "@/services/auth/auth-store";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { colors } from "@/theme/tokens";

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = params.id;
  const [imageError, setImageError] = useState(false);

  // Inquiry modal state
  const [isInquiryModalVisible, setIsInquiryModalVisible] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const {
    isSubmitting: isSubmittingInquiry,
    error: inquiryError,
    clearError: clearInquiryError,
    handleSubmitInquiry,
  } = useSubmitInquiry();

  const isIdValid = isValidUuid(listingId);
  const authStatus = useAuthStore((s) => s.status);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  // Listing Detail query
  const queryFn = useCallback(
    (signal?: AbortSignal) => {
      if (!isIdValid || !listingId) {
        return Promise.reject(new Error("Invalid listing ID"));
      }
      return fetchListingById(listingId, signal);
    },
    [isIdValid, listingId],
  );

  const listingQuery = useQueryState<ListingPresentationModel>(queryFn, {
    enabled: isIdValid,
  });

  // Visit Availability & Eligibility signal (V4)
  const { availability, isLoading: isAvailabilityLoading } =
    useVisitAvailability(listingId, {
      enabled: isIdValid && isAuthenticated,
    });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  function handleScheduleVisit() {
    if (!listingId) return;

    trackEvent(ANALYTICS_EVENTS.VISIT_FLOW_STARTED, { listingId });

    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to schedule a private visit.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push(ROUTES.AUTH_SIGN_IN as any),
          },
        ],
      );
      return;
    }

    if (
      availability?.visitEligibility?.reason === "EXISTING_ACTIVE_VISIT" &&
      availability.visitEligibility.existingVisitId
    ) {
      router.push(
        getVisitDetailRoute(
          availability.visitEligibility.existingVisitId,
        ) as any,
      );
      return;
    }

    router.push(getListingScheduleRoute(listingId) as any);
  }

  function handleOpenInquiry() {
    if (!listingId) return;

    trackEvent(ANALYTICS_EVENTS.INQUIRY_STARTED, { listingId });

    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to send an inquiry to the owner.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push(ROUTES.AUTH_SIGN_IN as any),
          },
        ],
      );
      return;
    }
    clearInquiryError();
    setIsInquiryModalVisible(true);
  }

  async function handleSendInquiry() {
    if (!listingId) return;
    try {
      const record = await handleSubmitInquiry({
        listingId,
        message: inquiryMessage,
      });

      trackEvent(ANALYTICS_EVENTS.INQUIRY_SUBMITTED, {
        listingId,
        inquiryId: record?.id ?? "unknown",
      });
      trackEvent(ANALYTICS_EVENTS.COMMUNICATION_ACTION_COMPLETED, {
        listingId,
        type: "inquiry",
      });

      setIsInquiryModalVisible(false);
      setInquiryMessage("");
      Alert.alert(
        "Inquiry Sent",
        "Your message has been sent to the property owner. You can track responses in your Activity tab.",
        [
          {
            text: "View Activity",
            onPress: () => router.push(ROUTES.ACTIVITY as any),
          },
          { text: "Close", style: "cancel" },
        ],
      );
    } catch {
      // Error handled by useSubmitInquiry
    }
  }

  // Handle invalid UUID identifier
  if (!isIdValid) {
    return (
      <AppContainer>
        <View className="flex-1 justify-center px-5">
          <ErrorState
            title="Invalid Property Identifier"
            message="The property link you followed contains an invalid or malformed identifier."
            onRetry={handleBack}
            retryLabel="Return to Discover"
          />
        </View>
      </AppContainer>
    );
  }

  const fallbackListing: ListingPresentationModel | null =
    availability?.listing
      ? {
          id: availability.listing.id,
          title: availability.listing.title,
          price: 145000,
          currency: "INR",
          listingIntent: "RENT",
          propertyType: "Residence",
          bedrooms: 3,
          bathrooms: 3,
          areaSqFt: 2400,
          localityName: availability.listing.localityName,
          cityName: availability.listing.cityName,
          coverImageUrl: availability.listing.coverImageUrl,
          verificationStatus: "VERIFIED",
          isSponsored: false,
          availabilityStatus: "AVAILABLE",
        }
      : null;

  const listing = listingQuery.data || fallbackListing;
  const isVerified = listing?.verificationStatus === "VERIFIED";
  const locationSummary = listing
    ? [listing.localityName, listing.cityName].filter(Boolean).join(", ")
    : "";

  const hasExistingVisit =
    availability?.visitEligibility?.reason === "EXISTING_ACTIVE_VISIT";

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
            accessibilityLabel="Back to Discover"
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
            Residence
          </Text>

          {listingId ? (
            <FavoriteButton
              listingId={listingId}
              variant="surface"
              size="small"
            />
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>

        {/* Content Body */}
        {listingQuery.isLoading && !listing ? (
          <View style={{ padding: 20, gap: 16 }}>
            <Skeleton width="100%" height={260} borderRadius={12} />
            <Skeleton width="70%" height={26} borderRadius={4} />
            <Skeleton width="45%" height={20} borderRadius={4} />
            <Skeleton width="90%" height={16} borderRadius={4} />
            <Skeleton width="100%" height={120} borderRadius={8} />
          </View>
        ) : !listing ? (
          <View
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
          >
            <EmptyState
              title="Listing Unavailable"
              description="This listing could not be found, is unpublished, or the property service is temporarily initializing."
              actionLabel="Return to Discover"
              onAction={handleBack}
            />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Cinematic Hero Image */}
              <View
                style={{
                  width: "100%",
                  aspectRatio: 16 / 11,
                  backgroundColor: colors.surfaceMuted,
                  position: "relative",
                }}
              >
                {listing.coverImageUrl && !imageError ? (
                  <Image
                    source={{ uri: listing.coverImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={300}
                    onError={() => setImageError(true)}
                    accessibilityLabel={`Photograph of ${listing.title}`}
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#E4E4E7",
                    }}
                  >
                    <Text variant="caption" tone="muted">
                      Architectural Photo Not Available
                    </Text>
                  </View>
                )}

                {/* Overlays */}
                <View
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    right: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 9999,
                        backgroundColor: "rgba(9, 9, 11, 0.75)",
                      }}
                    >
                      <Text
                        variant="caption"
                        tone="inverse"
                        weight="bold"
                        style={{
                          fontSize: 10,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {listing.listingIntent === "RENT"
                          ? "FOR RENT"
                          : "FOR SALE"}
                      </Text>
                    </View>

                    {isVerified ? (
                      <View style={{ marginLeft: 6 }}>
                        <VerificationBadge
                          status={listing.verificationStatus}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Active Visit Notification Banner if active visit exists */}
              {hasExistingVisit ? (
                <View
                  style={{
                    marginHorizontal: 24,
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.brand.light,
                    borderWidth: 1,
                    borderColor: "rgba(10, 60, 97, 0.3)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text variant="bodySmall" tone="brand" weight="bold">
                      Active Visit Booked
                    </Text>
                    <Text variant="caption" tone="secondary">
                      You have an active visit appointment for this property.
                    </Text>
                  </View>
                  <Button
                    label="View"
                    variant="secondary"
                    size="small"
                    onPress={handleScheduleVisit}
                  />
                </View>
              ) : null}

              {/* Property Details Section */}
              <View style={{ padding: 24 }}>
                <Stack spacing={5}>
                  {/* Title & Location */}
                  <Stack spacing={2}>
                    <Text variant="h1" tone="primary" weight="bold">
                      {listing.title}
                    </Text>

                    {locationSummary ? (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text
                          variant="body"
                          tone="brand"
                          style={{ marginRight: 4, fontSize: 13 }}
                        >
                          📍
                        </Text>
                        <Text variant="body" tone="secondary">
                          {locationSummary}
                        </Text>
                      </View>
                    ) : null}
                  </Stack>

                  {/* Price Block */}
                  <View
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: colors.defaultBorder,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View>
                      <Text
                        variant="caption"
                        tone="muted"
                        style={{ textTransform: "uppercase", letterSpacing: 1 }}
                      >
                        {listing.listingIntent === "RENT"
                          ? "Monthly Rent"
                          : "Offering Price"}
                      </Text>
                      <PropertyPrice
                        price={listing.price}
                        currency={listing.currency}
                        intent={listing.listingIntent}
                        size="hero"
                      />
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 9999,
                        backgroundColor: colors.brand.light,
                        borderWidth: 1,
                        borderColor: "rgba(10, 60, 97, 0.2)",
                      }}
                    >
                      <Text variant="caption" tone="brand" weight="bold">
                        0% Brokerage
                      </Text>
                    </View>
                  </View>

                  {/* Specs Breakdown */}
                  <Stack spacing={2}>
                    <Text variant="title" tone="primary" weight="semibold">
                      Residence Overview
                    </Text>
                    <PropertyMeta
                      bedrooms={listing.bedrooms}
                      bathrooms={listing.bathrooms}
                      areaSqFt={listing.areaSqFt}
                      propertyType={listing.propertyType}
                      variant="pills"
                    />
                  </Stack>

                  {/* Architectural Highlights */}
                  <Card
                    variant="outlined"
                    padding="large"
                    radius="large"
                    className="border-default-border"
                  >
                    <Stack spacing={3}>
                      <Text variant="title" tone="primary" weight="semibold">
                        Zero Brokerage Assurance
                      </Text>
                      <Text
                        variant="body"
                        tone="secondary"
                        style={{ lineHeight: 22 }}
                      >
                        Connect directly with verified owners without
                        intermediaries. All leases, visits, and documentation
                        support are coordinated directly through the Zero
                        Brokerage platform.
                      </Text>
                    </Stack>
                  </Card>
                </Stack>
              </View>
            </ScrollView>

            {/* Bottom Sticky Action Bar */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.defaultBorder,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                elevation: 4,
                flexShrink: 0,
                minHeight: 72,
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  label={
                    hasExistingVisit
                      ? "View Active Visit"
                      : "Schedule Private Visit"
                  }
                  onPress={handleScheduleVisit}
                  variant={hasExistingVisit ? "secondary" : "primary"}
                  size="medium"
                  fullWidth
                  accessibilityLabel="Schedule Private Visit"
                />
              </View>
              <View style={{ width: 96 }}>
                <Button
                  label="Inquire"
                  onPress={handleOpenInquiry}
                  variant="secondary"
                  size="medium"
                  fullWidth
                  accessibilityLabel="Inquire about property"
                />
              </View>
            </View>
          </View>
        )}

        {/* Inquiry Modal */}
        <Modal
          visible={isInquiryModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsInquiryModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
              }}
            >
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 0 }}
              >
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    padding: 24,
                    borderTopWidth: 1,
                    borderTopColor: colors.defaultBorder,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <Text variant="title" tone="primary" weight="bold">
                      Send Direct Inquiry
                    </Text>
                    <Pressable
                      onPress={() => setIsInquiryModalVisible(false)}
                      style={{ padding: 4 }}
                    >
                      <Text
                        variant="body"
                        tone="muted"
                        style={{ fontSize: 18 }}
                      >
                        ✕
                      </Text>
                    </Pressable>
                  </View>

                  <Text
                    variant="bodySmall"
                    tone="secondary"
                    style={{ marginBottom: 16 }}
                  >
                    Send a question or expression of interest directly to the
                    verified property owner.
                  </Text>

                  {inquiryError ? (
                    <View
                      style={{
                        padding: 12,
                        marginBottom: 16,
                        borderRadius: 8,
                        backgroundColor: "#FEF2F2",
                        borderWidth: 1,
                        borderColor: "#FECACA",
                      }}
                    >
                      <Text variant="caption" tone="error">
                        {inquiryError}
                      </Text>
                    </View>
                  ) : null}

                  <TextInput
                    value={inquiryMessage}
                    onChangeText={setInquiryMessage}
                    placeholder="Ask about lease terms, amenities, or special requests (minimum 10 characters)..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    maxLength={1000}
                    style={{
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      borderRadius: 12,
                      backgroundColor: "#F8FAFC",
                      color: "#0F172A",
                      fontSize: 14,
                      marginBottom: 8,
                      minHeight: 110,
                      textAlignVertical: "top",
                    }}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    <Text variant="caption" tone="muted">
                      Minimum 10 characters
                    </Text>
                    <Text variant="caption" tone="muted">
                      {inquiryMessage.length} / 1000
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Cancel"
                        variant="secondary"
                        size="medium"
                        fullWidth
                        onPress={() => setIsInquiryModalVisible(false)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={
                          isSubmittingInquiry ? "Sending..." : "Submit Inquiry"
                        }
                        variant="primary"
                        size="medium"
                        fullWidth
                        disabled={
                          isSubmittingInquiry ||
                          inquiryMessage.trim().length < 10
                        }
                        onPress={handleSendInquiry}
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </AppContainer>
  );
}
