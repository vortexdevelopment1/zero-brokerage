/**
 * Listing Detail Screen Foundation
 *
 * Enforces:
 * 1. Strict RFC 4122 UUID validation on route parameter `id`.
 * 2. Never accepts or expects full listing payload via navigation parameters.
 * 3. Contract-safe handling of missing backend listing endpoint (`DETAIL-API-001`).
 */

import React, { useCallback } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Stack, Text } from "@/components/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback";
import { isValidUuid, ROUTES } from "@/navigation/routes";
import { fetchListingById } from "@/features/discovery/api/discovery-api";
import { useQueryState } from "@/features/discovery/hooks/useQueryState";
import type { ListingSummaryDto } from "@/features/discovery/types/discovery.types";

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = params.id;

  const isIdValid = isValidUuid(listingId);

  const queryFn = useCallback(
    (signal?: AbortSignal) => {
      if (!isIdValid || !listingId) {
        return Promise.reject(new Error("Invalid listing ID"));
      }
      return fetchListingById(listingId, signal);
    },
    [isIdValid, listingId],
  );

  const listingQuery = useQueryState<ListingSummaryDto>(queryFn, {
    enabled: isIdValid,
  });

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  // Handle invalid UUID identifier
  if (!isIdValid) {
    return (
      <AppContainer>
        <View className="flex-1 justify-center px-5">
          <ErrorState
            title="Invalid Property Identifier"
            message="The property link you followed contains an invalid or malformed identifier."
            onRetry={handleBack}
            retryLabel="Return to Discover"
          />
        </View>
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-background">
        {/* Top Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between bg-surface border-b border-subtle-border">
          <Button
            label="← Back"
            variant="tertiary"
            size="small"
            onPress={handleBack}
            accessibilityLabel="Go back"
          />
          <Text variant="title" tone="primary" weight="bold">
            Property Details
          </Text>
          <View className="w-16" />
        </View>

        {/* Content Body */}
        <View className="flex-1 justify-center px-5">
          {listingQuery.isLoading ? (
            <LoadingState message="Loading property details..." />
          ) : listingQuery.isUnavailable || listingQuery.status === "error" ? (
            <EmptyState
              title="Listing Unavailable"
              description="This listing could not be found, is unpublished, or the property service is temporarily initializing."
              actionLabel="Return to Discover"
              onAction={handleBack}
            />
          ) : listingQuery.data ? (
            <Stack spacing={4}>
              <Text variant="h2" tone="primary" weight="bold">
                {listingQuery.data.title}
              </Text>
              <Text variant="body" tone="secondary">
                Price: {listingQuery.data.currency} {listingQuery.data.price}
              </Text>
            </Stack>
          ) : (
            <EmptyState
              title="Property Not Found"
              description="This listing is no longer active on Zero Brokerage."
              actionLabel="Return to Discover"
              onAction={handleBack}
            />
          )}
        </View>
      </View>
    </AppContainer>
  );
}
