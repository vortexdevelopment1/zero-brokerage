/**
 * Listing Detail Screen
 *
 * Enforces:
 * 1. Strict RFC 4122 UUID validation on route parameter `id`.
 * 2. Never accepts or expects full listing payload via navigation parameters.
 * 3. Contract-safe handling of missing backend listing endpoint.
 * 4. Immersive editorial presentation with high-res hero imagery and visit request flow.
 */

import React, { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
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
import { isValidUuid, ROUTES } from "@/navigation/routes";
import { fetchListingById } from "@/features/discovery/api/discovery-api";
import { useQueryState } from "@/features/discovery/hooks/useQueryState";
import type { ListingPresentationModel } from "@/features/discovery/types/discovery.types";
import { PropertyPrice } from "@/features/discovery/components/PropertyPrice";
import { PropertyMeta } from "@/features/discovery/components/PropertyMeta";
import { VerificationBadge } from "@/features/discovery/components/VerificationBadge";
import { FavoriteButton } from "@/features/discovery/components/FavoriteButton";
import { trackEvent } from "@/services/analytics/analytics";

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = params.id;
  const [imageError, setImageError] = useState(false);

  const isIdValid = isValidUuid(listingId);

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

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  function handleScheduleVisit() {
    if (!listingQuery.data) return;
    Alert.alert(
      "Private Visit Scheduling",
      `Direct visit scheduling for ${listingQuery.data.title} is currently being integrated with verified property owners. Scheduling requests are not recorded yet while visit coordination services are finalizing.`,
      [{ text: "Understood" }],
    );
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

  const listing = listingQuery.data;
  const isVerified = listing?.verificationStatus === "VERIFIED";
  const locationSummary = listing
    ? [listing.localityName, listing.cityName].filter(Boolean).join(", ")
    : "";

  return (
    <AppContainer edges={["top"]}>
      <View className="flex-1 bg-surface">
        {/* Navigation Bar */}
        <View className="px-5 py-3 flex-row items-center justify-between bg-surface border-b border-subtle-border z-10">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            onPress={handleBack}
            className="flex-row items-center py-1.5 px-3 rounded-full bg-surface-muted border border-default-border active:opacity-70"
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
            <View className="w-8" />
          )}
        </View>

        {/* Content Body */}
        {listingQuery.isLoading ? (
          <View className="p-5 space-y-4">
            <Skeleton width="100%" height={260} borderRadius={12} />
            <Skeleton width="70%" height={26} borderRadius={4} />
            <Skeleton width="45%" height={20} borderRadius={4} />
            <Skeleton width="90%" height={16} borderRadius={4} />
            <Skeleton width="100%" height={120} borderRadius={8} />
          </View>
        ) : listingQuery.isUnavailable ||
          listingQuery.status === "error" ||
          !listing ? (
          <View className="flex-1 justify-center px-5">
            <EmptyState
              title="Listing Unavailable"
              description="This listing could not be found, is unpublished, or the property service is temporarily initializing."
              actionLabel="Return to Discover"
              onAction={handleBack}
            />
          </View>
        ) : (
          <View className="flex-1">
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {/* Cinematic Hero Image */}
              <View className="relative w-full aspect-[16/11] bg-surface-muted">
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
                  <View className="w-full h-full items-center justify-center bg-neutral-200">
                    <Text variant="caption" tone="muted">
                      Architectural Photo Not Available
                    </Text>
                  </View>
                )}

                {/* Overlays */}
                <View className="absolute top-4 left-4 right-4 flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-2">
                    <View className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md">
                      <Text
                        variant="caption"
                        tone="inverse"
                        weight="bold"
                        className="text-[10px] tracking-widest uppercase"
                      >
                        {listing.listingIntent === "RENT"
                          ? "FOR RENT"
                          : "FOR SALE"}
                      </Text>
                    </View>

                    {isVerified ? (
                      <View className="ml-1.5">
                        <VerificationBadge
                          status={listing.verificationStatus}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Property Details Section */}
              <View className="p-6">
                <Stack spacing={5}>
                  {/* Title & Location */}
                  <Stack spacing={2}>
                    <Text variant="h1" tone="primary" weight="bold">
                      {listing.title}
                    </Text>

                    {locationSummary ? (
                      <View className="flex-row items-center">
                        <Text
                          variant="body"
                          tone="brand"
                          className="mr-1 text-[13px]"
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
                  <View className="p-4 rounded-large bg-surface-muted border border-default-border flex-row items-center justify-between">
                    <View>
                      <Text
                        variant="caption"
                        tone="muted"
                        className="uppercase tracking-wider"
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

                    <View className="px-3 py-1.5 rounded-full bg-brand-light border border-brand/20">
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
                        className="leading-6"
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
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-surface border-t border-subtle-border flex-row items-center space-x-3">
              <View className="flex-1">
                <Button
                  label="Schedule Private Visit"
                  onPress={handleScheduleVisit}
                  variant="primary"
                  size="large"
                  fullWidth
                  accessibilityLabel="Schedule Private Visit"
                  accessibilityHint="Private visit scheduling preview (service integration in progress)"
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </AppContainer>
  );
}
