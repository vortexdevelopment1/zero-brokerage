/**
 * Saved Listings Tab
 *
 * Displays saved favorites when authenticated or in local session.
 * Provides a clean sign-in prompt when visited by a guest user.
 */

import React from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Stack, Text } from "@/components/primitives";
import { EmptyState } from "@/components/feedback";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";
import { useFavoritesStore } from "@/features/discovery/stores/favorites-store";
import { FIXTURE_LISTINGS } from "@/features/discovery/fixtures/discovery-fixtures";
import { ListingCard } from "@/features/discovery/components/ListingCard";

export default function SavedTab() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === "AUTHENTICATED";
  const savedIds = useFavoritesStore((state) => state.savedListingIds);

  function handleSignIn() {
    router.push(ROUTES.AUTH_SIGN_IN as any);
  }

  const savedListings = FIXTURE_LISTINGS.filter((item) =>
    savedIds.has(item.id),
  );

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
            SAVED PROPERTIES
          </Text>
          <Text variant="h2" tone="primary" weight="bold">
            Favorites
          </Text>
        </View>

        {/* Content */}
        {!isAuthenticated ? (
          <View className="flex-1 justify-center px-5">
            <EmptyState
              title="Sign In to Sync Favorites"
              description="Keep track of your favorite homes, compare specifications, and receive price drop alerts across all your devices."
              actionLabel="Sign In with Mobile"
              onAction={handleSignIn}
            />
          </View>
        ) : savedListings.length === 0 ? (
          <View className="flex-1 justify-center px-5">
            <EmptyState
              title="No Saved Properties"
              description="Browse the Discover feed and tap the heart icon on any property to save it to your private collection."
              actionLabel="Explore Properties"
              onAction={() => router.push(ROUTES.DISCOVER as any)}
            />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Stack spacing={4}>
              <Text variant="bodySmall" tone="secondary">
                {savedListings.length} saved{" "}
                {savedListings.length === 1 ? "residence" : "residences"}
              </Text>
              {savedListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </Stack>
          </ScrollView>
        )}
      </View>
    </AppContainer>
  );
}
