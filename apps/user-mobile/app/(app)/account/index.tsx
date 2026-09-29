/**
 * Account Tab
 *
 * Displays profile information, session state, and sign out controls.
 * Shows sign-in prompt when visited by a guest user.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Card, Stack, Text } from "@/components/primitives";
import { EmptyState } from "@/components/feedback";
import { logout, useAuthStore } from "@/services/auth";
import { maskPhoneNumber } from "@/features/auth/utils/phone-validation";
import { ROUTES } from "@/navigation/routes";

export default function AccountTab() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === "AUTHENTICATED";
  const isLoggingOut = status === "LOGGING_OUT";

  async function handleLogout() {
    await logout();
    router.replace(ROUTES.DISCOVER as any);
  }

  function handleSignIn() {
    router.push(ROUTES.AUTH_SIGN_IN as any);
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[11px]"
          >
            PREFERENCES & SECURITY
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Account
          </Text>
        </View>

        {/* Content */}
        {!isAuthenticated ? (
          <View className="flex-1 justify-center px-5">
            <EmptyState
              title="Sign In to Manage Account"
              description="Access your verified identity, saved preferences, rental agreements, and notification settings."
              actionLabel="Sign In with Mobile"
              onAction={handleSignIn}
            />
          </View>
        ) : (
          <View className="flex-1 px-5 pt-6 justify-between pb-8">
            <Stack spacing={6}>
              <Stack spacing={1}>
                <Text variant="title" tone="primary" weight="bold">
                  {user?.fullName || "Zero Brokerage Member"}
                </Text>
                <Text variant="bodySmall" tone="secondary">
                  Member since {new Date().getFullYear()}
                </Text>
              </Stack>

              <Card variant="outlined" padding="medium" radius="large">
                <Stack spacing={4}>
                  <Text variant="title" tone="primary" weight="semibold">
                    Account Profile
                  </Text>

                  <Stack spacing={2}>
                    <View className="flex-row justify-between py-2 border-b border-subtle-border">
                      <Text variant="bodySmall" tone="secondary">
                        Mobile Number
                      </Text>
                      <Text
                        variant="bodySmall"
                        tone="primary"
                        weight="semibold"
                      >
                        {user?.phone ? maskPhoneNumber(user.phone) : "Verified"}
                      </Text>
                    </View>

                    <View className="flex-row justify-between py-2 border-b border-subtle-border">
                      <Text variant="bodySmall" tone="secondary">
                        Role
                      </Text>
                      <Text
                        variant="bodySmall"
                        tone="primary"
                        weight="semibold"
                      >
                        {user?.role ?? "USER"}
                      </Text>
                    </View>

                    <View className="flex-row justify-between py-2">
                      <Text variant="bodySmall" tone="secondary">
                        Session Status
                      </Text>
                      <Text
                        variant="bodySmall"
                        tone="success"
                        weight="semibold"
                      >
                        Active & Encrypted
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
        )}
      </View>
    </AppContainer>
  );
}
