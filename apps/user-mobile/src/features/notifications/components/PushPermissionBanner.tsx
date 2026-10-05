/**
 * Push Notification Permission Banner Component
 *
 * Explains value proposition before prompting; non-blocking; dismissible.
 */

import React from "react";
import { View } from "react-native";
import { Button, Card, Pressable, Stack, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";

interface PushPermissionBannerProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export function PushPermissionBanner({
  onEnable,
  onDismiss,
}: PushPermissionBannerProps) {
  return (
    <Card
      variant="outlined"
      padding="medium"
      radius="large"
      style={{
        backgroundColor: "#FEFCE8",
        borderColor: "#FEF08A",
        marginBottom: 16,
      }}
    >
      <Stack spacing={3}>
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center space-x-2 flex-1 pr-2">
            <Text className="text-xl">🔔</Text>
            <Stack spacing={1} className="flex-1">
              <Text variant="title" tone="primary" weight="bold">
                Stay Updated on Private Visits
              </Text>
              <Text variant="bodySmall" tone="secondary" className="text-[12px] leading-4">
                Receive real-time tour confirmations, rescheduled times, and verified representative replies.
              </Text>
            </Stack>
          </View>

          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification prompt"
            className="p-1 active:opacity-60"
          >
            <Text variant="caption" tone="muted" weight="bold">
              ✕
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center space-x-3 pt-1">
          <Button
            label="Turn On Alerts"
            size="small"
            variant="primary"
            onPress={onEnable}
            accessibilityLabel="Turn on push notifications"
          />
          <Button
            label="Not Now"
            size="small"
            variant="tertiary"
            onPress={onDismiss}
            accessibilityLabel="Dismiss push notification prompt"
          />
        </View>
      </Stack>
    </Card>
  );
}
