/**
 * Property Hero Component (Editorial Showcase)
 *
 * Designed for visual rhythm at the top of the Discover feed.
 * Features cinematic imagery, generous padding, and clear hierarchy.
 * Clean non-nested Pressable architecture.
 */

import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Card, Pressable, Stack, Text } from "@/components/primitives";
import type { ListingPresentationModel } from "../types/discovery.types";
import { getListingDetailRoute } from "@/navigation/routes";
import { trackEvent } from "@/services/analytics/analytics";
import { PropertyPrice } from "./PropertyPrice";
import { PropertyMeta } from "./PropertyMeta";
import { VerificationBadge } from "./VerificationBadge";
import { FavoriteButton } from "./FavoriteButton";

interface PropertyHeroProps {
  listing: ListingPresentationModel;
  label?: string;
  onPress?: (listing: ListingPresentationModel) => void;
}

export function PropertyHero({
  listing,
  label = "FEATURED RESIDENCE",
  onPress,
}: PropertyHeroProps) {
  const [imageError, setImageError] = useState(false);

  function handlePress() {
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
  const locationSummary = [listing.localityName, listing.cityName]
    .filter(Boolean)
    .join(", ");

  return (
    <View className="mb-6">
      <Card
        variant="elevated"
        padding="none"
        radius="large"
        className="overflow-hidden border border-default-border bg-surface"
      >
        {/* Cinematic Aspect Ratio Image */}
        <View className="relative w-full aspect-[16/11] bg-surface-muted overflow-hidden">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Featured property: ${listing.title}, in ${locationSummary}`}
            accessibilityHint="Opens property details"
            onPress={handlePress}
            className="w-full h-full"
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
              <View className="w-full h-full items-center justify-center bg-neutral-200">
                <Text variant="caption" tone="muted">
                  Architectural Preview
                </Text>
              </View>
            )}
          </Pressable>

          {/* Top Overlays */}
          <View
            pointerEvents="box-none"
            className="absolute top-3 left-3 right-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-1.5">
              <View className="px-2.5 py-1 rounded-full bg-neutral-900/85 backdrop-blur-md">
                <Text
                  variant="caption"
                  tone="inverse"
                  weight="bold"
                  className="text-[10px] tracking-widest uppercase"
                >
                  {listing.listingIntent === "RENT" ? "FOR RENT" : "FOR SALE"}
                </Text>
              </View>

              {isVerified ? (
                <View className="ml-1.5">
                  <VerificationBadge status={listing.verificationStatus} />
                </View>
              ) : null}
            </View>

            <FavoriteButton listingId={listing.id} variant="floating" />
          </View>

          {/* Sponsored label if explicitly flagged */}
          {listing.isSponsored ? (
            <View className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm">
              <Text
                variant="caption"
                tone="inverse"
                className="text-[9px] uppercase tracking-wider text-neutral-300"
              >
                SPONSORED
              </Text>
            </View>
          ) : null}
        </View>

        {/* Editorial Body */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Details for ${listing.title}`}
          onPress={handlePress}
          className="p-5"
        >
          <Stack spacing={3}>
            <View className="flex-row items-center justify-between">
              <Text
                variant="label"
                tone="brand"
                weight="bold"
                className="tracking-widest uppercase text-[11px]"
              >
                {label}
              </Text>
              {listing.availabilityStatus === "UNDER_OFFER" ? (
                <Text variant="caption" tone="warning" weight="semibold">
                  Under Offer
                </Text>
              ) : null}
            </View>

            <Text
              variant="h2"
              tone="primary"
              weight="bold"
              numberOfLines={2}
              className="leading-7"
            >
              {listing.title}
            </Text>

            <PropertyMeta
              bedrooms={listing.bedrooms}
              bathrooms={listing.bathrooms}
              areaSqFt={listing.areaSqFt}
              propertyType={listing.propertyType}
            />

            {locationSummary ? (
              <View className="flex-row items-center">
                <Text
                  variant="caption"
                  tone="muted"
                  className="mr-1 text-[12px]"
                >
                  📍
                </Text>
                <Text
                  variant="bodySmall"
                  tone="secondary"
                  numberOfLines={1}
                  className="text-[13px]"
                >
                  {locationSummary}
                </Text>
              </View>
            ) : null}

            {/* Price & Action Row */}
            <View className="pt-2 border-t border-subtle-border flex-row items-center justify-between">
              <PropertyPrice
                price={listing.price}
                currency={listing.currency}
                intent={listing.listingIntent}
                size="large"
              />

              <View className="px-4 py-2 rounded-medium bg-brand">
                <Text
                  variant="bodySmall"
                  tone="inverse"
                  weight="semibold"
                  className="text-[12px]"
                >
                  View Details →
                </Text>
              </View>
            </View>
          </Stack>
        </Pressable>
      </Card>
    </View>
  );
}
