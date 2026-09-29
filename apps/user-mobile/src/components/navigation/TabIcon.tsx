/**
 * Custom Tab Icon Component
 *
 * Provides minimalist, high-contrast tab icons using pure React Native primitives.
 * Fully compatible with web, iOS, Android, and test runners without external icon dependencies.
 */

import React from "react";
import { type ColorValue, View } from "react-native";
import { Text } from "@/components/primitives/Text";
import { colors } from "@/theme/tokens";

export type TabKey = "discover" | "saved" | "activity" | "account";

interface TabIconProps {
  name: TabKey;
  focused: boolean;
  color?: ColorValue;
  size?: number;
}

const TAB_ICONS: Record<TabKey, { active: string; inactive: string }> = {
  discover: { active: "✦", inactive: "✧" },
  saved: { active: "♥", inactive: "♡" },
  activity: { active: "●", inactive: "○" },
  account: { active: "◼", inactive: "◻" },
};

export function TabIcon({
  name,
  focused,
  color = colors.primaryContent,
}: TabIconProps) {
  const iconConfig = TAB_ICONS[name] ?? { active: "•", inactive: "◦" };
  const glyph = focused ? iconConfig.active : iconConfig.inactive;

  return (
    <View className="items-center justify-center w-7 h-7">
      <Text
        variant="bodyLarge"
        style={{ color: color as string, fontSize: 18, lineHeight: 22 }}
        accessibilityElementsHidden
      >
        {glyph}
      </Text>
    </View>
  );
}
