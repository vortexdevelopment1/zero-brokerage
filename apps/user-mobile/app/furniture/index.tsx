/**
 * Furniture Marketplace Screen
 *
 * Contextual sub-journey reached from Discover.
 * Explains curated room packages with zero brokerage fee.
 */

import React from "react";
import { Alert, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Card, Pressable, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";
import { trackEvent } from "@/services/analytics/analytics";

interface FurniturePackage {
  id: string;
  title: string;
  category: string;
  desc: string;
  price: string;
  imageUrl: string;
  items: string[];
}

const FURNITURE_PACKAGES: readonly FurniturePackage[] = [
  {
    id: "pkg-living",
    title: "Minimalist Living Room Suite",
    category: "LIVING ROOM",
    desc: "Bespoke linen sofa with solid white oak coffee table, sculpted lounge chair, and ambient floor lighting.",
    price: "₹3,499 / mo",
    imageUrl:
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80&auto=format&fit=crop",
    items: [
      "3-Seater Sand Linen Sofa",
      "Solid Oak Round Coffee Table",
      "Bouclé Accent Armchair",
      "Dimmable Brass Floor Lamp",
    ],
  },
  {
    id: "pkg-bedroom",
    title: "Master Bedroom Retreat",
    category: "BEDROOM",
    desc: "King bed with orthopedic hybrid mattress, walnut bedside tables, and handcrafted reading lights.",
    price: "₹4,299 / mo",
    imageUrl:
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80&auto=format&fit=crop",
    items: [
      "Upholstered King Bed Frame",
      "Orthopedic Pocket-Spring Mattress",
      "Dual Walnut Nightstands",
      "Minimalist 4-Door Wardrobe",
    ],
  },
  {
    id: "pkg-wfh",
    title: "Executive Workstation",
    category: "STUDY & WORK",
    desc: "Ergonomic dual-motor sit-stand desk, mesh high-back task chair, and integrated power hub.",
    price: "₹1,899 / mo",
    imageUrl:
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80&auto=format&fit=crop",
    items: [
      "Motorized Sit-Stand Oak Desk",
      "Ergonomic Lumbar Task Chair",
      "LED Task Light & Cable Track",
    ],
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

  function handleInquire(pkg: FurniturePackage) {
    trackEvent("furniture_banner_clicked", { packageId: pkg.id });
    Alert.alert(
      "Curated Living Inquiry",
      `Turnkey furniture suites are currently in catalog preview. Direct package inquiries and delivery coordination are not yet connected while fulfillment services are finalizing.`,
      [{ text: "Understood" }],
    );
  }

  return (
    <AppContainer edges={["top"]}>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="px-5 py-3 flex-row items-center justify-between bg-surface border-b border-subtle-border">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            onPress={handleBack}
            className="flex-row items-center py-1.5 px-3 rounded-full bg-surface-muted border border-default-border active:opacity-70"
          >
            <Text variant="bodySmall" tone="primary" weight="semibold">
              ← Discover
            </Text>
          </Pressable>

          <Text variant="title" tone="primary" weight="bold">
            Curated Living
          </Text>

          <View className="w-16" />
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <Stack spacing={6}>
            <Stack spacing={1}>
              <Text
                variant="label"
                tone="brand"
                weight="bold"
                className="tracking-widest uppercase text-[10px]"
              >
                TURNKEY INTERIORS
              </Text>
              <Text variant="h1" tone="primary" weight="bold">
                Move-In Ready Suites
              </Text>
              <Text variant="body" tone="secondary" className="leading-5">
                Elevate your zero-brokerage residence with curated room
                collections. Free delivery, professional installation, and zero
                broker markup.
              </Text>
            </Stack>

            <Stack spacing={5}>
              {FURNITURE_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  variant="elevated"
                  padding="none"
                  radius="large"
                  className="overflow-hidden border border-default-border bg-surface"
                >
                  {/* Photo */}
                  <View className="w-full aspect-[16/9] bg-surface-muted">
                    <Image
                      source={{ uri: pkg.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={250}
                      accessibilityLabel={pkg.title}
                    />
                    <View className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md">
                      <Text
                        variant="caption"
                        tone="inverse"
                        weight="bold"
                        className="text-[10px] tracking-wider uppercase"
                      >
                        {pkg.category}
                      </Text>
                    </View>
                  </View>

                  {/* Body */}
                  <View className="p-5">
                    <Stack spacing={3}>
                      <View className="flex-row items-baseline justify-between">
                        <Text
                          variant="title"
                          tone="primary"
                          weight="bold"
                          className="flex-1 mr-2"
                        >
                          {pkg.title}
                        </Text>
                        <Text variant="h3" tone="brand" weight="bold">
                          {pkg.price}
                        </Text>
                      </View>

                      <Text
                        variant="bodySmall"
                        tone="secondary"
                        className="leading-5"
                      >
                        {pkg.desc}
                      </Text>

                      {/* Items checklist */}
                      <View className="p-3 rounded-medium bg-surface-muted border border-subtle-border space-y-1">
                        <Text
                          variant="caption"
                          tone="muted"
                          weight="bold"
                          className="uppercase text-[10px]"
                        >
                          Package Inclusions:
                        </Text>
                        {pkg.items.map((item, idx) => (
                          <Text key={idx} variant="caption" tone="secondary">
                            • {item}
                          </Text>
                        ))}
                      </View>

                      <View className="pt-2">
                        <Button
                          label="Inquire Suite"
                          variant="primary"
                          size="medium"
                          onPress={() => handleInquire(pkg)}
                          accessibilityLabel={`Inquire about ${pkg.title}`}
                          accessibilityHint="Furniture package inquiry preview (fulfillment integration in progress)"
                          fullWidth
                        />
                      </View>
                    </Stack>
                  </View>
                </Card>
              ))}
            </Stack>

            <View className="py-6 items-center">
              <Text variant="caption" tone="muted" align="center">
                All furniture packages include complimentary assembly and
                relocation support within the city.
              </Text>
            </View>
          </Stack>
        </ScrollView>
      </View>
    </AppContainer>
  );
}
