/**
 * Furniture Marketplace Screen
 *
 * Contextual sub-journey reached from Discover.
 * Explains curated room packages with zero brokerage fee.
 */

import React from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Card, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";

const FURNITURE_PACKAGES = [
  {
    id: "pkg-living",
    title: "Minimalist Living Room Suite",
    desc: "3-seater linen sofa, solid oak coffee table, media console, and floor lamp.",
    price: "₹3,499 / mo",
  },
  {
    id: "pkg-bedroom",
    title: "Master Bedroom Retreat",
    desc: "King bed with orthopedic mattress, dual bedside tables, and 4-door wardrobe.",
    price: "₹4,299 / mo",
  },
  {
    id: "pkg-wfh",
    title: "Ergonomic Workstation",
    desc: "Height-adjustable desk, Herman Miller style mesh chair, and cable management.",
    price: "₹1,899 / mo",
  },
];

export default function FurnitureScreen() {
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between bg-surface border-b border-subtle-border">
          <Button
            label="← Discover"
            variant="tertiary"
            size="small"
            onPress={handleBack}
            accessibilityLabel="Back to Discover"
          />
          <Text variant="title" tone="primary" weight="bold">
            Furniture
          </Text>
          <View className="w-16" />
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <Stack spacing={6}>
            <Stack spacing={1}>
              <Text
                variant="label"
                tone="brand"
                weight="bold"
                className="tracking-widest uppercase text-[11px]"
              >
                CURATED PACKAGES
              </Text>
              <Text variant="h2" tone="primary" weight="bold">
                Move In Ready Living
              </Text>
              <Text variant="body" tone="secondary">
                Furnish your zero-brokerage rental with designer room packages.
                Free delivery, installation, and zero deposit options.
              </Text>
            </Stack>

            <Stack spacing={4}>
              {FURNITURE_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-default-border"
                >
                  <Stack spacing={3}>
                    <View className="flex-row items-baseline justify-between">
                      <Text variant="title" tone="primary" weight="bold">
                        {pkg.title}
                      </Text>
                      <Text variant="bodySmall" tone="brand" weight="bold">
                        {pkg.price}
                      </Text>
                    </View>
                    <Text variant="bodySmall" tone="secondary">
                      {pkg.desc}
                    </Text>
                    <View className="pt-1">
                      <Button
                        label="Inquire Package"
                        variant="secondary"
                        size="small"
                        onPress={() => {}}
                        accessibilityLabel={`Inquire about ${pkg.title}`}
                      />
                    </View>
                  </Stack>
                </Card>
              ))}
            </Stack>

            <View className="py-8 items-center">
              <Text variant="caption" tone="muted" align="center">
                All furniture packages include complimentary maintenance and
                relocation support.
              </Text>
            </View>
          </Stack>
        </ScrollView>
      </View>
    </AppContainer>
  );
}
