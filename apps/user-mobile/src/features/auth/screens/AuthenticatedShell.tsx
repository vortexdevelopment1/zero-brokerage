import React from "react";
import { View } from "react-native";

import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Card, Stack, Text } from "@/components/primitives";
import { logout, useAuthStore } from "@/services/auth";

import { maskPhoneNumber } from "../utils/phone-validation";

export function AuthenticatedShell() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const isLoggingOut = status === "LOGGING_OUT";

  async function handleLogout() {
    await logout();
  }

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
              Authenticated Session
            </Text>
            <Text variant="display" tone="primary" weight="bold">
              Welcome{user?.fullName ? `, ${user.fullName}` : ""}
            </Text>
            <Text variant="bodyLarge" tone="secondary">
              You are signed in to Zero Brokerage.
            </Text>
          </Stack>

          <Card variant="outlined" padding="medium" radius="large">
            <Stack spacing={4}>
              <Text variant="title" tone="primary" weight="semibold">
                Account Details
              </Text>

              <Stack spacing={2}>
                <View className="flex-row justify-between py-1 border-b border-subtle-border">
                  <Text variant="bodySmall" tone="secondary">
                    Mobile Number
                  </Text>
                  <Text variant="bodySmall" tone="primary" weight="semibold">
                    {user?.phone ? maskPhoneNumber(user.phone) : "Verified"}
                  </Text>
                </View>

                <View className="flex-row justify-between py-1 border-b border-subtle-border">
                  <Text variant="bodySmall" tone="secondary">
                    Role
                  </Text>
                  <Text variant="bodySmall" tone="primary" weight="semibold">
                    {user?.role ?? "USER"}
                  </Text>
                </View>

                <View className="flex-row justify-between py-1">
                  <Text variant="bodySmall" tone="secondary">
                    Session Status
                  </Text>
                  <Text variant="bodySmall" tone="success" weight="semibold">
                    Active
                  </Text>
                </View>
              </Stack>
            </Stack>
          </Card>
        </Stack>

        <Box className="pt-8">
          <Button
            label="Sign Out"
            onPress={handleLogout}
            variant="destructive"
            size="large"
            loading={isLoggingOut}
            loadingLabel="Signing out..."
            fullWidth
          />
        </Box>
      </View>
    </AppContainer>
  );
}
