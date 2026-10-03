/**
 * Onboarding Screen
 *
 * Welcoming onboarding step following successful verification.
 * Respects backend contract boundaries without inventing mandatory fields.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Card, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";
import { maskPhoneNumber } from "../utils/phone-validation";

type OnboardingScreenProps = {
  phone?: string;
  onLogout: () => void;
  isLoggingOut?: boolean;
};

export function OnboardingScreen({
  phone,
  onLogout,
  isLoggingOut = false,
}: OnboardingScreenProps) {
  function handleExplore() {
    router.replace(ROUTES.DISCOVER as any);
  }

  return (
    <AppContainer>
      <View className="flex-1 px-6 pt-16 pb-8 justify-between bg-surface">
        <Stack spacing={6}>
          {/* Header */}
          <Stack spacing={2}>
            <View className="px-2.5 py-1 self-start rounded-full bg-success-light border border-success/30">
              <Text
                variant="caption"
                tone="success"
                weight="bold"
                className="tracking-widest uppercase text-[10px]"
              >
                ✓ PHONE VERIFIED
              </Text>
            </View>
            <Text variant="display" tone="primary" weight="bold">
              Welcome to Zero Brokerage
            </Text>
            <Text variant="bodyLarge" tone="secondary">
              Your mobile number{" "}
              {phone ? (
                <Text variant="bodyLarge" tone="primary" weight="semibold">
                  {maskPhoneNumber(phone)}
                </Text>
              ) : null}{" "}
              is now securely authenticated.
            </Text>
          </Stack>

          {/* Member Privileges Card */}
          <Card
            variant="outlined"
            padding="large"
            radius="large"
            className="border-default-border bg-surface-muted"
          >
            <Stack spacing={3}>
              <Text variant="title" tone="primary" weight="semibold">
                What you can do now:
              </Text>
              <Stack spacing={2}>
                <View className="flex-row items-center">
                  <Text variant="body" tone="brand" className="mr-2.5">
                    ✦
                  </Text>
                  <Text variant="body" tone="primary">
                    Save and track your favorite residences
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text variant="body" tone="brand" className="mr-2.5">
                    ✦
                  </Text>
                  <Text variant="body" tone="primary">
                    Schedule direct private visits with verified owners
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text variant="body" tone="brand" className="mr-2.5">
                    ✦
                  </Text>
                  <Text variant="body" tone="primary">
                    Zero brokerage fees across all transactions
                  </Text>
                </View>
              </Stack>
            </Stack>
          </Card>
        </Stack>

        <Stack spacing={3} className="pt-8">
          <Button
            label="Start Exploring Homes"
            onPress={handleExplore}
            variant="primary"
            size="large"
            fullWidth
          />

          <Button
            label="Sign Out"
            onPress={onLogout}
            variant="tertiary"
            size="medium"
            loading={isLoggingOut}
            fullWidth
          />
        </Stack>
      </View>
    </AppContainer>
  );
}
