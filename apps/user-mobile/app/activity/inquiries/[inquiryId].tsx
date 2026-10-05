/**
 * Inquiry Detail Screen
 *
 * Route: `/activity/inquiries/:inquiryId`
 *
 * Enforces:
 * 1. Authoritative fetch by inquiryId (GET /api/v1/inquiries/:inquiryId).
 * 2. Strict RFC 4122 UUID validation.
 * 3. Status rendering (SUBMITTED, ACKNOWLEDGED, RESPONDED, CLOSED).
 * 4. Property linking back to listing detail.
 * 5. Luxury/calm editorial visual language.
 */

import React from "react";
import { ScrollView, View } from "react-native";
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
  getListingScheduleRoute,
  isValidUuid,
  ROUTES,
} from "@/navigation/routes";
import { useInquiryDetail } from "@/features/inquiries/hooks/useInquiryDetail";
import type { InquiryStatus } from "@/features/inquiries/types/inquiries.types";
import { colors } from "@/theme/tokens";

function getInquiryBadgeConfig(status: InquiryStatus): {
  label: string;
  bgStyle: { backgroundColor: string; borderColor: string };
  textTone: "primary" | "secondary" | "brand" | "error" | "inverse";
} {
  switch (status) {
    case "RESPONDED":
      return {
        label: "RESPONDED",
        bgStyle: {
          backgroundColor: colors.success.light,
          borderColor: colors.success.border,
        },
        textTone: "primary",
      };
    case "ACKNOWLEDGED":
      return {
        label: "ACKNOWLEDGED",
        bgStyle: {
          backgroundColor: colors.info.light,
          borderColor: colors.info.border,
        },
        textTone: "primary",
      };
    case "SUBMITTED":
      return {
        label: "SUBMITTED",
        bgStyle: {
          backgroundColor: colors.warning.light,
          borderColor: colors.warning.border,
        },
        textTone: "primary",
      };
    case "CLOSED":
      return {
        label: "CLOSED",
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

export default function InquiryDetailScreen() {
  const params = useLocalSearchParams<{ inquiryId?: string }>();
  const inquiryId = params.inquiryId;

  const isIdValid = isValidUuid(inquiryId);

  const { inquiry, isLoading, isInvalidId, error, errorMessage, refetch } =
    useInquiryDetail(inquiryId, { enabled: isIdValid });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.ACTIVITY as any);
    }
  }

  // Handle invalid UUID
  if (isInvalidId || !isIdValid) {
    return (
      <AppContainer edges={["top"]}>
        <View className="flex-1 justify-center px-6">
          <ErrorState
            title="Invalid Inquiry Identifier"
            message="The inquiry identifier is missing or malformed."
            onRetry={handleBack}
            retryLabel="Return to Activity"
          />
        </View>
      </AppContainer>
    );
  }

  const badge = inquiry ? getInquiryBadgeConfig(inquiry.status) : null;

  return (
    <AppContainer edges={["top", "bottom"]}>
      <View className="flex-1 bg-surface">
        {/* Navigation Bar */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: "#E2E8F0",
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
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text variant="bodySmall" tone="primary" weight="semibold">
              ← Back
            </Text>
          </Pressable>

          <Text variant="title" tone="primary" weight="bold">
            Property Inquiry
          </Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Content Body */}
        {isLoading ? (
          <View style={{ padding: 24, gap: 16 }}>
            <Skeleton width="100%" height={140} borderRadius={12} />
            <Skeleton width="70%" height={24} borderRadius={4} />
            <Skeleton width="100%" height={100} borderRadius={8} />
          </View>
        ) : error || !inquiry ? (
          <View
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
          >
            <ErrorState
              title="Inquiry Not Found"
              message={
                errorMessage ||
                "This inquiry could not be found or you do not have permission to view it."
              }
              onRetry={refetch}
              retryLabel="Retry"
            />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          >
            <Card
              variant="outlined"
              padding="large"
              radius="large"
              style={{ marginBottom: 20 }}
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
                        backgroundColor: badge.bgStyle.backgroundColor,
                        borderColor: badge.bgStyle.borderColor,
                      }}
                    >
                      <Text
                        variant="caption"
                        tone={badge.textTone}
                        weight="bold"
                        style={{ fontSize: 11 }}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Property Brief */}
                <Pressable
                  onPress={() =>
                    router.push(getListingDetailRoute(inquiry.listingId) as any)
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: "#F8FAFC",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  {inquiry.listingCoverImageUrl ? (
                    <Image
                      source={{ uri: inquiry.listingCoverImageUrl }}
                      style={{ width: 64, height: 64, borderRadius: 8 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        backgroundColor: "#E2E8F0",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text variant="caption" tone="muted">
                        No Photo
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="body"
                      tone="primary"
                      weight="bold"
                      numberOfLines={1}
                    >
                      {inquiry.listingTitle}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {inquiry.listingLocalityName}, {inquiry.listingCityName}
                    </Text>
                    <Text
                      variant="caption"
                      tone="brand"
                      weight="semibold"
                      style={{ marginTop: 4 }}
                    >
                      View Residence Details →
                    </Text>
                  </View>
                </Pressable>

                {/* Inquiry Message */}
                <View
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text
                    variant="caption"
                    tone="muted"
                    style={{ textTransform: "uppercase", marginBottom: 6 }}
                  >
                    Your Message to Owner
                  </Text>
                  <Text
                    variant="body"
                    tone="primary"
                    style={{ lineHeight: 22 }}
                  >
                    {inquiry.message}
                  </Text>
                </View>

                {/* Metadata */}
                <View
                  style={{
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#F1F5F9",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="caption" tone="muted">
                    Inquiry Ref: {inquiry.id.slice(0, 18)}...
                  </Text>
                  <Text variant="caption" tone="muted">
                    Sent: {new Date(inquiry.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </Stack>
            </Card>

            <Card
              variant="outlined"
              padding="large"
              radius="large"
              className="mb-4"
            >
              <Stack spacing={2}>
                <Text variant="bodySmall" tone="primary" weight="bold">
                  Owner Response Timeline
                </Text>
                <Text
                  variant="caption"
                  tone="secondary"
                  style={{ lineHeight: 20 }}
                >
                  Verified property owners typically respond within 24 to 48
                  hours. Once the owner acknowledges or replies, update
                  notifications will appear in your Activity dashboard.
                </Text>
              </Stack>
            </Card>

            <Card variant="outlined" padding="large" radius="large">
              <Stack spacing={3}>
                <Text variant="bodySmall" tone="primary" weight="bold">
                  Want to view this property?
                </Text>
                <Text
                  variant="caption"
                  tone="secondary"
                  style={{ lineHeight: 20 }}
                >
                  Book a confidential 1-on-1 private viewing directly with the
                  verified owner.
                </Text>
                <Button
                  label="Schedule Private Visit"
                  variant="primary"
                  size="small"
                  fullWidth
                  onPress={() =>
                    router.push(
                      getListingScheduleRoute(inquiry.listingId) as any,
                    )
                  }
                />
              </Stack>
            </Card>
          </ScrollView>
        )}
      </View>
    </AppContainer>
  );
}
