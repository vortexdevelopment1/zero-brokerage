import React from "react";
import { Tabs } from "expo-router";
import { colors } from "@/theme/tokens";
import { TabIcon } from "@/components/navigation/TabIcon";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.mutedContent,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.subtleBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="discover/index"
        options={{
          title: "Discover",
          tabBarAccessibilityLabel: "Discover tab",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="discover" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved/index"
        options={{
          title: "Saved",
          tabBarAccessibilityLabel: "Saved properties tab",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="saved" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity/index"
        options={{
          title: "Activity",
          tabBarAccessibilityLabel: "Activity and visits tab",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="activity" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account/index"
        options={{
          title: "Account",
          tabBarAccessibilityLabel: "Account and profile tab",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="account" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
