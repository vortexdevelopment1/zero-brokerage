/**
 * Listing Card Component
 *
 * Production property card foundation.
 *
 * Principles:
 * 1. Consumes typed backend data only (`ListingSummaryDto`).
 * 2. Fixed aspect ratio image container to prevent layout shift.
 * 3. Graceful fallback when coverImageUrl is missing or fails to load.
 * 4. Displays verified badge ONLY if `verificationStatus === 'VERIFIED'`.
 * 5. Displays sponsored badge ONLY if `isSponsored === true`.
 * 6. Never calculates trust score, ranking, or availability locally.
 * 7. Formats currency (INR) and area cleanly.
 */

import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Card, Pressable, Stack, Text } from "@/components/primitives";
import type { ListingSummaryDto } from "../types/discovery.types";
import { getListingDetailRoute } from "@/navigation/routes";
import { trackEvent } from "@/services/analytics/analytics";
import { formatArea, formatPrice } from "../utils/formatters";

export { formatArea, formatPrice };

interface ListingCardProps {
  listing: ListingSummaryDto;
  onPress?: (listing: ListingSummaryDto) => void;
}

export function ListingCard({ listing, onPress }: ListingCardProps) {
  const [imageError, setImageError] = useState(false);

  function handleCardPress() {
    trackEvent("listing_opened", {
      listingId: listing.id,
      isSponsored: listing.isSponsored ?? false,
    });

    if (onPress) {
      onPress(listing);
    } else {
      router.push(getListingDetailRoute(listing.id) as any);
    }
  }

  const isVerified = listing.verificationStatus === "VERIFIED";
  const isSponsored = listing.isSponsored === true;
  const priceDisplay = formatPrice(listing.price, listing.currency);
  const areaDisplay = formatArea(listing.areaSqFt);

  // Property specs summary (e.g. "3 BHK • 1,450 sq.ft • Apartment")
  const specs: string[] = [];
  if (listing.bedrooms) {
    specs.push(`${listing.bedrooms} BHK`);
  }
  if (areaDisplay) {
    specs.push(areaDisplay);
  }
  if (listing.propertyType) {
    specs.push(listing.propertyType);
  }
  const specsSummary = specs.join(" • ");

  const locationSummary = [listing.localityName, listing.cityName]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${priceDisplay}${
        specsSummary ? `, ${specsSummary}` : ""
      }${locationSummary ? ` in ${locationSummary}` : ""}${
        isVerified ? ", Verified" : ""
      }${isSponsored ? ", Sponsored" : ""}`}
      accessibilityHint="Opens property details"
      onPress={handleCardPress}
      className="mb-4"
    >
      <Card
        variant="elevated"
        padding="none"
        radius="large"
        className="overflow-hidden border border-default-border bg-surface"
      >
        {/* Media Container with 16:9 Aspect Ratio */}
        <View className="relative w-full aspect-[16/10] bg-surface-muted overflow-hidden">
          {listing.coverImageUrl && !imageError ? (
            <Image
              source={{ uri: listing.coverImageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
              onError={() => setImageError(true)}
              accessibilityLabel={`Photo of ${listing.title}`}
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-neutral-200">
              <Text variant="caption" tone="muted">
                No Preview Available
              </Text>
            </View>
          )}

          {/* Badges Overlay */}
          <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
            <View className="flex-row items-center space-x-1.5">
              {/* Intent Pill */}
              <View className="px-2.5 py-1 rounded-full bg-neutral-900/80 backdrop-blur-md">
                <Text
                  variant="caption"
                  tone="inverse"
                  weight="bold"
                  className="text-[10px] tracking-wider uppercase"
                >
                  {listing.listingIntent === "RENT" ? "FOR RENT" : "FOR SALE"}
                </Text>
              </View>

              {/* Verified Badge */}
              {isVerified ? (
                <View className="px-2.5 py-1 rounded-full bg-success/90 backdrop-blur-md ml-1.5">
                  <Text
                    variant="caption"
                    tone="inverse"
                    weight="bold"
                    className="text-[10px] tracking-wider uppercase"
                  >
                    ✓ VERIFIED
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Sponsored Placement Indicator */}
            {isSponsored ? (
              <View className="px-2 py-0.5 rounded bg-neutral-800/80 backdrop-blur-md">
                <Text
                  variant="caption"
                  tone="inverse"
                  weight="medium"
                  className="text-[9px] uppercase tracking-wider text-neutral-300"
                >
                  SPONSORED
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Content Body */}
        <View className="p-4">
          <Stack spacing={2}>
            {/* Price Row */}
            <View className="flex-row items-baseline justify-between">
              <Text variant="h3" tone="primary" weight="bold">
                {priceDisplay}
                {listing.listingIntent === "RENT" ? (
                  <Text variant="bodySmall" tone="secondary" weight="regular">
                    /mo
                  </Text>
                ) : null}
              </Text>

              {listing.availabilityStatus === "UNDER_OFFER" ? (
                <Text
                  variant="caption"
                  tone="warning"
                  weight="semibold"
                  className="text-[11px]"
                >
                  Under Offer
                </Text>
              ) : null}
            </View>

            {/* Property Title */}
            <Text
              variant="title"
              tone="primary"
              weight="semibold"
              numberOfLines={1}
            >
              {listing.title}
            </Text>

            {/* Specs Summary */}
            {specsSummary ? (
              <Text
                variant="bodySmall"
                tone="secondary"
                weight="medium"
                numberOfLines={1}
              >
                {specsSummary}
              </Text>
            ) : null}

            {/* Location */}
            {locationSummary ? (
              <View className="flex-row items-center pt-0.5">
                <Text
                  variant="caption"
                  tone="muted"
                  className="mr-1 text-[11px]"
                >
                  📍
                </Text>
                <Text
                  variant="caption"
                  tone="secondary"
                  numberOfLines={1}
                  className="text-[12px]"
                >
                  {locationSummary}
                </Text>
              </View>
            ) : null}
          </Stack>
        </View>
      </Card>
    </Pressable>
  );
}
