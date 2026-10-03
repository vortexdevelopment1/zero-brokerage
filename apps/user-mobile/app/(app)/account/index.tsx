/**
 * Account Tab
 *
 * Displays profile information, session state, and sign out controls.
 * Shows sign-in prompt when visited by a guest user.
 */

import React from "react";
import { Alert, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import {
  Box,
  Button,
  Card,
  Pressable,
  Stack,
  Text,
} from "@/components/primitives";
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
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace(ROUTES.DISCOVER as any);
        },
      },
    ]);
  }

  function handleSignIn() {
    router.push(ROUTES.AUTH_SIGN_IN as any);
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[10px]"
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
          <ScrollView
            className="flex-1 px-5 pt-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Stack spacing={6}>
              {/* Profile Card */}
              <View className="flex-row items-center space-x-4">
                <View className="w-16 h-16 rounded-full bg-brand items-center justify-center">
                  <Text variant="h2" tone="inverse" weight="bold">
                    {user?.fullName ? user.fullName[0].toUpperCase() : "U"}
                  </Text>
                </View>
                <Stack spacing={1}>
                  <Text variant="title" tone="primary" weight="bold">
                    {user?.fullName || "Zero Brokerage Member"}
                  </Text>
                  <Text variant="bodySmall" tone="secondary">
                    {user?.phone
                      ? maskPhoneNumber(user.phone)
                      : "Verified User"}
                  </Text>
                  <View className="pt-1 flex-row">
                    <View className="px-2 py-0.5 rounded bg-brand-light border border-brand/20">
                      <Text
                        variant="caption"
                        tone="brand"
                        weight="bold"
                        className="text-[10px]"
                      >
                        VERIFIED PROFILE
                      </Text>
                    </View>
                  </View>
                </Stack>
              </View>

              {/* Account Details */}
              <Card
                variant="outlined"
                padding="large"
                radius="large"
                className="border-default-border bg-surface"
              >
                <Stack spacing={4}>
                  <Text variant="title" tone="primary" weight="semibold">
                    Security & Credentials
                  </Text>

                  <Stack spacing={1}>
                    <View className="flex-row justify-between py-2.5 border-b border-subtle-border">
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

                    <View className="flex-row justify-between py-2.5 border-b border-subtle-border">
                      <Text variant="bodySmall" tone="secondary">
                        Account Role
                      </Text>
                      <Text
                        variant="bodySmall"
                        tone="primary"
                        weight="semibold"
                      >
                        {user?.role ?? "MEMBER"}
                      </Text>
                    </View>

                    <View className="flex-row justify-between py-2.5">
                      <Text variant="bodySmall" tone="secondary">
                        Session Encryption
                      </Text>
                      <Text
                        variant="bodySmall"
                        tone="success"
                        weight="semibold"
                      >
                        TLS 1.3 Active
                      </Text>
                    </View>
                  </Stack>
                </Stack>
              </Card>

              {/* Platform Info */}
              <Card
                variant="outlined"
                padding="medium"
                radius="large"
                className="border-default-border bg-surface-muted"
              >
                <Stack spacing={1}>
                  <Text
                    variant="caption"
                    tone="muted"
                    weight="bold"
                    className="uppercase text-[10px]"
                  >
                    Zero Brokerage Mobile
                  </Text>
                  <Text variant="caption" tone="secondary">
                    Version 1.0.0 (Milestone M04)
                  </Text>
                  <Text variant="caption" tone="muted">
                    Direct architectural marketplace without broker commissions.
                  </Text>
                </Stack>
              </Card>

              {/* Sign Out */}
              <Box className="pt-4">
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
            </Stack>
          </ScrollView>
        )}
      </View>
    </AppContainer>
  );
}
