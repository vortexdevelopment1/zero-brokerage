/**
 * Support Entry Card Component
 *
 * Provides a clean, luxury card linking to in-app support workflows.
 * Embeddable in Account, Activity, and Notification screens.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Card, Pressable, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";
import { colors } from "@/theme/tokens";

interface SupportEntryCardProps {
  title?: string;
  description?: string;
  category?: string;
  relatedEntityType?: "VISIT" | "INQUIRY" | "LISTING";
  relatedEntityId?: string;
}

export function SupportEntryCard({
  title = "Need Assistance?",
  description = "Get direct help with scheduled visits, representative communications, or account security.",
  category,
  relatedEntityType,
  relatedEntityId,
}: SupportEntryCardProps) {
  function handlePress() {
    router.push({
      pathname: ROUTES.SUPPORT_REQUEST as any,
      params: {
        category,
        relatedEntityType,
        relatedEntityId,
      },
    });
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint="Opens support request form"
      className="active:opacity-85"
    >
      <Card
        variant="outlined"
        padding="medium"
        radius="large"
        style={{
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.defaultBorder,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-3 flex-1 pr-3">
            <View className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-default-border">
              <Text className="text-lg">🎧</Text>
            </View>
            <Stack spacing={1} className="flex-1">
              <Text variant="body" tone="primary" weight="bold">
                {title}
              </Text>
              <Text variant="caption" tone="secondary">
                {description}
              </Text>
            </Stack>
          </View>

          <Text variant="body" tone="brand" weight="bold">
            →
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
