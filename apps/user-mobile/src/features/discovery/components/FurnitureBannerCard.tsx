/**
 * Furniture Marketplace Entry Card
 *
 * Promotes the zero-brokerage furnished living journey contextually from Discover.
 * Editorial design moment connecting architectural residences with turnkey interiors.
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
        accessibilityLabel="Living by Zero Brokerage, Explore Turnkey Furnished Packages"
        accessibilityHint="Opens the Zero Brokerage designer home furnishing catalog"
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
              <View className="px-2.5 py-1 rounded-full bg-brand/30 border border-brand/50">
                <Text
                  variant="caption"
                  tone="brand"
                  weight="bold"
                  className="tracking-widest uppercase text-[10px]"
                >
                  LIVING BY ZERO BROKERAGE
                </Text>
              </View>
              <Text variant="bodySmall" tone="inverse" weight="bold">
                →
              </Text>
            </View>

            <Stack spacing={1}>
              <Text variant="h3" tone="inverse" weight="bold">
                Turnkey Designer Interiors
              </Text>
              <Text
                variant="bodySmall"
                tone="secondary"
                className="text-neutral-300 leading-5"
              >
                Furnish your zero-brokerage residence with curated room suites.
                Delivered, assembled, and zero broker markup.
              </Text>
            </Stack>

            <View className="pt-1 flex-row items-center">
              <Text
                variant="bodySmall"
                tone="brand"
                weight="bold"
                className="text-[13px]"
              >
                Explore Curated Suites →
              </Text>
            </View>
          </Stack>
        </Card>
      </Pressable>
    </View>
  );
}
