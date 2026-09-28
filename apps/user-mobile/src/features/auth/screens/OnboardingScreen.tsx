import React from "react";
import { View } from "react-native";

import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Card, Stack, Text } from "@/components/primitives";

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
  return (
    <AppContainer>
      <View className="flex-1 px-6 pt-16 pb-8 justify-between">
        <Stack spacing={6}>
          <Stack spacing={2}>
            <Text
              variant="label"
              tone="brand"
              className="tracking-widest uppercase"
            >
              Profile Setup
            </Text>
            <Text variant="display" tone="primary" weight="bold">
              Account Created
            </Text>
            <Text variant="bodyLarge" tone="secondary">
              Your mobile number{" "}
              {phone ? (
                <Text variant="bodyLarge" tone="primary" weight="semibold">
                  {maskPhoneNumber(phone)}
                </Text>
              ) : null}{" "}
              is verified.
            </Text>
          </Stack>

          <Card variant="outlined" padding="medium" radius="large">
            <Stack spacing={3}>
              <Text variant="title" tone="primary" weight="semibold">
                Profile Registration
              </Text>
              <Text variant="body" tone="secondary">
                The profile completion API is awaiting backend deployment in the
                shared identity service. Once deployed, full name and
                preferences will be recorded here.
              </Text>
            </Stack>
          </Card>
        </Stack>

        <Box className="pt-8">
          <Button
            label="Sign Out"
            onPress={onLogout}
            variant="secondary"
            size="large"
            loading={isLoggingOut}
            fullWidth
          />
        </Box>
      </View>
    </AppContainer>
  );
}
