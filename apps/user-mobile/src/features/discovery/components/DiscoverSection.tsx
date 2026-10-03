/**
 * Discover Section Container
 *
 * Provides isolated error and state boundaries per section:
 * - Loading (layout-matching skeletons)
 * - Success
 * - Empty
 * - Partial Failure / Error
 * - Unavailable / Initializing
 * - Offline
 *
 * Ensures a single failed section never crashes or blocks the entire screen.
 */

import React from "react";
import { View } from "react-native";
import { Card, Stack, Text } from "@/components/primitives";
import {
  EmptyState,
  ErrorState,
  OfflineState,
  PropertyCardSkeleton,
} from "@/components/feedback";

export interface DiscoverSectionProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  isUnavailable?: boolean;
  isOffline?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export function DiscoverSection({
  title,
  subtitle,
  isLoading = false,
  isUnavailable = false,
  isOffline = false,
  error = null,
  isEmpty = false,
  emptyTitle = "No listings available",
  emptyDescription = "There are no listings in this section currently.",
  onRetry,
  actionLabel,
  onAction,
  children,
}: DiscoverSectionProps) {
  return (
    <View className="py-4">
      {/* Section Header */}
      <View className="px-5 mb-3 flex-row items-baseline justify-between">
        <Stack spacing={1}>
          <Text variant="h3" tone="primary" weight="bold">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </Stack>

        {actionLabel && onAction ? (
          <Text
            accessibilityRole="button"
            variant="bodySmall"
            tone="brand"
            weight="semibold"
            onPress={onAction}
          >
            {actionLabel}
          </Text>
        ) : null}
      </View>

      {/* Section Body with Isolated State Boundaries */}
      <View className="px-5">
        {isLoading ? (
          <View>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </View>
        ) : isOffline ? (
          <Card variant="outlined" padding="medium" radius="large">
            <OfflineState
              title="Section Offline"
              message="Unable to connect. Connect to the internet to load this section."
              onRetry={onRetry}
            />
          </Card>
        ) : isUnavailable ? (
          <Card
            variant="outlined"
            padding="medium"
            radius="large"
            className="border-dashed border-default-border"
          >
            <EmptyState
              title={`${title} Service Initializing`}
              description="This catalog section is being prepared. Check back shortly."
              actionLabel={onRetry ? "Check Again" : undefined}
              onAction={onRetry}
            />
          </Card>
        ) : error ? (
          <Card variant="outlined" padding="medium" radius="large">
            <ErrorState
              title={`Unable to load ${title}`}
              message={error}
              onRetry={onRetry}
              retryLabel="Try Again"
            />
          </Card>
        ) : isEmpty ? (
          <Card
            variant="outlined"
            padding="medium"
            radius="large"
            className="border-dashed border-default-border"
          >
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={onRetry ? "Refresh" : undefined}
              onAction={onRetry}
            />
          </Card>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
