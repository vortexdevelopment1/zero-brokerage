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
      {/* Top Row: Brand & Account Access */}
      <View className="flex-row items-center justify-between">
        <Stack spacing={1}>
          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[10px]"
          >
            ZERO BROKERAGE
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Where to live?
          </Text>
        </Stack>

        <View className="flex-row items-center">
          {isAuthenticated ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Account"
              accessibilityHint="Navigates to your profile and account settings"
              onPress={handleAuthPress}
              className="flex-row items-center px-3 py-1.5 rounded-full bg-brand-light border border-brand/20 active:opacity-80"
            >
              <View className="w-5 h-5 rounded-full bg-brand items-center justify-center mr-1.5">
                <Text
                  variant="caption"
                  tone="inverse"
                  weight="bold"
                  className="text-[10px]"
                >
                  {user?.fullName ? user.fullName[0].toUpperCase() : "U"}
                </Text>
              </View>
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
          accessibilityLabel={`Location filter: ${locationLabel}`}
          accessibilityHint="Geospatial location filtering is pending backend geocoding service integration"
          onPress={handleLocationTap}
          className="flex-row items-center self-start py-1 px-3 rounded-full bg-surface-muted border border-default-border active:bg-neutral-200"
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
            weight="semibold"
            className="text-[12px]"
          >
            {locationLabel}
          </Text>
          <Text variant="caption" tone="muted" className="ml-1 text-[10px]">
            ▾
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
