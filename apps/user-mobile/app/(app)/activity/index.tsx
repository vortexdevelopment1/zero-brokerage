/**
 * Activity Tab
 *
 * Tracks visits, inquiries, and rental/purchase milestones.
 * Provides a clean sign-in prompt when visited by a guest user.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Text } from "@/components/primitives";
import { EmptyState } from "@/components/feedback";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";

export default function ActivityTab() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === "AUTHENTICATED";

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
            YOUR JOURNEYS
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Activity
          </Text>
        </View>

        {/* Content */}
        <View className="flex-1 justify-center px-5">
          {!isAuthenticated ? (
            <EmptyState
              title="Sign In to Track Activity"
              description="Monitor property visit requests, chat with verified owners, and manage your rental agreements in one place."
              actionLabel="Sign In with Mobile"
              onAction={handleSignIn}
            />
          ) : (
            <EmptyState
              title="No Active Requests"
              description="When you schedule property visits or submit inquiries, their live status will be tracked here."
              actionLabel="Find Properties to Visit"
              onAction={() => router.push(ROUTES.DISCOVER as any)}
            />
          )}
        </View>
      </View>
    </AppContainer>
  );
}
