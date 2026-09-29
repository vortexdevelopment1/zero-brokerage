/**
 * Furniture Marketplace Entry Card
 *
 * Promotes the zero-brokerage furnished living journey contextually from Discover.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Card, Pressable, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";
import { trackEvent } from "@/services/analytics/analytics";

export function FurnitureBannerCard() {
  function handlePress() {
    trackEvent("furniture_banner_clicked", { source: "discover_home" });
    router.push(ROUTES.FURNITURE as any);
  }

  return (
    <View className="px-5 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explore Furniture Marketplace"
        accessibilityHint="Opens the Zero Brokerage designer home furnishing marketplace"
        onPress={handlePress}
      >
        <Card
          variant="elevated"
          padding="large"
          radius="large"
          className="bg-neutral-900 border border-neutral-800"
        >
          <Stack spacing={3}>
            <View className="flex-row items-center justify-between">
              <View className="px-2.5 py-1 rounded-full bg-brand/20 border border-brand/40">
                <Text
                  variant="caption"
                  tone="brand"
                  weight="bold"
                  className="tracking-wider uppercase text-[10px]"
                >
                  CURATED LIVING
                </Text>
              </View>
              <Text variant="caption" tone="inverse" weight="bold">
                →
              </Text>
            </View>

            <Stack spacing={1}>
              <Text variant="h3" tone="inverse" weight="bold">
                Designer Furniture Marketplace
              </Text>
              <Text
                variant="bodySmall"
                tone="secondary"
                className="text-neutral-400"
              >
                Rent or purchase bespoke room packages delivered and installed
                with zero brokerage fee.
              </Text>
            </Stack>

            <View className="pt-1">
              <Text
                variant="bodySmall"
                tone="brand"
                weight="semibold"
                className="text-[13px]"
              >
                Browse Curated Furniture Collections →
              </Text>
            </View>
          </Stack>
        </Card>
      </Pressable>
    </View>
  );
}
