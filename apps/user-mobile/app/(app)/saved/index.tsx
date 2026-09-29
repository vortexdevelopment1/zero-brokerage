/**
 * Saved Listings Tab
 *
 * Displays saved favorites when authenticated.
 * Provides a clean sign-in prompt when visited by a guest user.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Stack, Text } from "@/components/primitives";
import { EmptyState } from "@/components/feedback";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";

export default function SavedTab() {
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
            SAVED PROPERTIES
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Favorites
          </Text>
        </View>

        {/* Content */}
        <View className="flex-1 justify-center px-5">
          {!isAuthenticated ? (
            <EmptyState
              title="Sign In to View Saved Properties"
              description="Keep track of your favorite homes, compare options, and receive price drop alerts across all your devices."
              actionLabel="Sign In with Mobile"
              onAction={handleSignIn}
            />
          ) : (
            <EmptyState
              title="No Saved Properties"
              description="Browse the Discover feed and tap the heart icon on any property to save it to your favorites."
              actionLabel="Explore Properties"
              onAction={() => router.push(ROUTES.DISCOVER as any)}
            />
          )}
        </View>
      </View>
    </AppContainer>
  );
}
