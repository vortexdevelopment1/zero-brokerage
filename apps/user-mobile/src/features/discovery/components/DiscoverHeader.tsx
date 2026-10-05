/**
 * Discover Screen Header
 *
 * NOTE ON LOCATION:
 * Real locality geocoding and city selection endpoints are NOT yet registered in `services/api`.
 * The location indicator reflects an honest placeholder state without implying fake geocoding.
 */

import React, { useState } from "react";
import {
  Modal,
  Pressable as RNPressable,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { Button, Pressable, Stack, Text } from "@/components/primitives";
import { useAuthStore } from "@/services/auth";
import { useUnreadCount } from "@/features/notifications";
import { colors } from "@/theme/tokens";
import { ROUTES } from "@/navigation/routes";
import { trackEvent } from "@/services/analytics/analytics";

export interface LocationOption {
  readonly id: string;
  readonly name: string;
  readonly subtitle?: string;
}

export const AVAILABLE_LOCATIONS: readonly LocationOption[] = [
  { id: "all", name: "All Locations", subtitle: "All luxury residences" },
  { id: "mumbai", name: "Mumbai", subtitle: "Worli Sea Face, Bandra West" },
  { id: "bengaluru", name: "Bengaluru", subtitle: "Indiranagar" },
  { id: "hyderabad", name: "Hyderabad", subtitle: "Jubilee Hills" },
  { id: "delhi", name: "New Delhi", subtitle: "Defence Colony" },
  { id: "pune", name: "Pune", subtitle: "Koregaon Park" },
];

interface DiscoverHeaderProps {
  locationLabel?: string;
  selectedLocation?: string;
  onSelectLocation?: (location: string) => void;
  onLocationPress?: () => void;
}

export function DiscoverHeader({
  locationLabel,
  selectedLocation = "All Locations",
  onSelectLocation,
  onLocationPress,
}: DiscoverHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentLabel = locationLabel || selectedLocation;

  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = status === "AUTHENTICATED";
  const { unreadCount } = useUnreadCount({ enabled: isAuthenticated });

  function handleAuthPress() {
    if (isAuthenticated) {
      router.push(ROUTES.ACCOUNT as any);
    } else {
      router.push(ROUTES.AUTH_SIGN_IN as any);
    }
  }

  function handleLocationTap() {
    setIsDropdownOpen((prev) => !prev);
    onLocationPress?.();
  }

  function handleSelect(locName: string) {
    setIsDropdownOpen(false);
    onSelectLocation?.(locName);
    trackEvent("location_selected", { location: locName });
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

        <View className="flex-row items-center space-x-2">
          {isAuthenticated && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
              accessibilityHint="Navigates to Notification Center"
              onPress={() => router.push(ROUTES.NOTIFICATIONS as any)}
              className="w-8 h-8 rounded-full bg-surface-muted border border-default-border items-center justify-center active:opacity-75 mr-2"
            >
              <Text className="text-xs">🔔</Text>
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.brand.primary,
                  }}
                />
              )}
            </Pressable>
          )}

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
          accessibilityLabel={`Location filter: ${currentLabel}`}
          accessibilityHint="Select a location to filter luxury properties"
          onPress={handleLocationTap}
          className="flex-row items-center self-start py-1.5 px-3 rounded-full bg-surface-muted border border-default-border active:bg-neutral-200"
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
            {currentLabel}
          </Text>
          <Text variant="caption" tone="muted" className="ml-1 text-[10px]">
            {isDropdownOpen ? "▴" : "▾"}
          </Text>
        </Pressable>
      </View>

      {/* Location Dropdown Menu */}
      <Modal
        visible={isDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <RNPressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsDropdownOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss location menu"
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.25)" }} />
        </RNPressable>

        <View
          style={{
            position: "absolute",
            top: 115,
            left: 20,
            right: 20,
            maxWidth: 320,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.defaultBorder,
            paddingVertical: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="px-4 py-2 flex-row items-center justify-between border-b border-subtle-border">
            <Text
              variant="caption"
              tone="secondary"
              weight="bold"
              className="uppercase text-[11px] tracking-wider"
            >
              Select City
            </Text>
            <RNPressable
              onPress={() => setIsDropdownOpen(false)}
              className="p-1 active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel="Close location menu"
            >
              <Text variant="caption" tone="muted" weight="bold">
                ✕
              </Text>
            </RNPressable>
          </View>

          <View className="py-1">
            {AVAILABLE_LOCATIONS.map((loc) => {
              const isSelected =
                currentLabel.toLowerCase() === loc.name.toLowerCase() ||
                (loc.id === "all" && currentLabel === "All Locations");
              return (
                <RNPressable
                  key={loc.id}
                  onPress={() => handleSelect(loc.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`${loc.name}, ${loc.subtitle || ""}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    backgroundColor: isSelected
                      ? colors.brand.light
                      : "transparent",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="bodySmall"
                      tone={isSelected ? "brand" : "primary"}
                      weight={isSelected ? "bold" : "medium"}
                    >
                      {loc.name}
                    </Text>
                    {loc.subtitle && (
                      <Text
                        variant="caption"
                        tone="muted"
                        style={{ fontSize: 11 }}
                      >
                        {loc.subtitle}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Text variant="bodySmall" tone="brand" weight="bold">
                      ✓
                    </Text>
                  )}
                </RNPressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}
