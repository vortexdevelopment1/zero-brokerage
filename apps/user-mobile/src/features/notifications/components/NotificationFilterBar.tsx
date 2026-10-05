/**
 * Notification Category Filter Bar Component
 *
 * Provides accessible horizontal pill filter buttons for notification categories.
 */

import React from "react";
import { ScrollView, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
import type { NotificationCategory } from "../types/notifications.types";

interface NotificationFilterBarProps {
  selectedCategory: NotificationCategory | "ALL";
  onSelectCategory: (category: NotificationCategory | "ALL") => void;
}

const CATEGORIES: Array<{ key: NotificationCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "VISIT_UPDATE", label: "Visits" },
  { key: "INQUIRY_UPDATE", label: "Inquiries" },
  { key: "LISTING_UPDATE", label: "Listings" },
  { key: "ACCOUNT_SECURITY", label: "Security" },
  { key: "SYSTEM_ANNOUNCEMENT", label: "Announcements" },
];

export function NotificationFilterBar({
  selectedCategory,
  onSelectCategory,
}: NotificationFilterBarProps) {
  return (
    <View className="py-2.5 bg-surface border-b border-subtle-border">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <View className="flex-row items-center space-x-2">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => onSelectCategory(cat.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${cat.label}`}
                accessibilityState={{ selected: isSelected }}
                style={[
                  {
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: isSelected
                      ? colors.brand.primary
                      : colors.surfaceMuted,
                    borderColor: isSelected
                      ? colors.brand.primary
                      : colors.defaultBorder,
                  },
                ]}
                className="active:opacity-80 mr-2"
              >
                <Text
                  variant="caption"
                  tone={isSelected ? "inverse" : "secondary"}
                  weight={isSelected ? "bold" : "medium"}
                  className="text-[12px]"
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
