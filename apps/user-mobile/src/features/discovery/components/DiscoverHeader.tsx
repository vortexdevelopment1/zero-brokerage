/**
 * Discover Screen Header
 *
 * NOTE ON LOCATION:
 * Real locality geocoding and city selection endpoints are NOT yet registered in `services/api`.
 * The location indicator reflects an honest placeholder state without implying fake geocoding.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Pressable, Stack, Text } from "@/components/primitives";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";
import { trackEvent } from "@/services/analytics/analytics";

interface DiscoverHeaderProps {
  locationLabel?: string;
  onLocationPress?: () => void;
}

export function DiscoverHeader({
  locationLabel = "All Locations",
  onLocationPress,
}: DiscoverHeaderProps) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = status === "AUTHENTICATED";

  function handleAuthPress() {
    if (isAuthenticated) {
      router.push(ROUTES.ACCOUNT as any);
    } else {
      router.push(ROUTES.AUTH_SIGN_IN as any);
    }
  }

  function handleLocationTap() {
    trackEvent("location_selected", { location: locationLabel });
    onLocationPress?.();
  }

  return (
    <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
      {/* Top Row: Brand & Profile/Sign-In */}
      <View className="flex-row items-center justify-between">
        <Stack spacing={1}>
          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[11px]"
          >
            ZERO BROKERAGE
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Discover
          </Text>
        </Stack>

        <View className="flex-row items-center">
          {isAuthenticated ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Account"
              accessibilityHint="Navigates to your profile and account settings"
              onPress={handleAuthPress}
              className="px-3.5 py-1.5 rounded-full bg-brand-light border border-brand/20 active:opacity-80"
            >
              <Text
                variant="bodySmall"
                tone="brand"
                weight="bold"
                className="text-[12px]"
              >
                {user?.fullName ? user.fullName.split(" ")[0] : "Account"}
              </Text>
            </Pressable>
          ) : (
            <Button
              label="Sign In"
              variant="secondary"
              size="small"
              onPress={handleAuthPress}
              accessibilityLabel="Sign In"
              accessibilityHint="Opens the authentication screen"
            />
          )}
        </View>
      </View>

      {/* Location Context Bar */}
      <View className="mt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Location: ${locationLabel}`}
          accessibilityHint="Geospatial location filtering is pending backend geocoding service integration"
          onPress={handleLocationTap}
          className="flex-row items-center self-start py-1 px-2.5 rounded-full bg-surface-muted border border-default-border/60 active:bg-surface-elevated"
        >
          <Text
            variant="caption"
            tone="brand"
            weight="semibold"
            className="mr-1.5 text-[11px]"
          >
            📍
          </Text>
          <Text
            variant="caption"
            tone="secondary"
            weight="medium"
            className="text-[12px]"
          >
            {locationLabel}
          </Text>
          <Text variant="caption" tone="muted" className="ml-1 text-[10px]">
            ▼
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
