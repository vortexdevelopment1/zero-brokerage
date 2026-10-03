/**
 * Activity Tab
 *
 * Tracks visits, inquiries, and rental/purchase milestones.
 * Provides a clean sign-in prompt when visited by a guest user.
 */

import React from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Card, Stack, Text } from "@/components/primitives";
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
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <Text
            variant="label"
            tone="brand"
            weight="bold"
            className="tracking-widest uppercase text-[10px]"
          >
            JOURNEYS & VISITS
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
              description="Monitor property visit appointments, direct owner chats, and digital lease agreements in one place."
              actionLabel="Sign In with Mobile"
              onAction={handleSignIn}
            />
          ) : (
            <ScrollView
              className="flex-1 pt-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Stack spacing={4}>
                <Text variant="bodySmall" tone="secondary">
                  Recent Journey Updates
                </Text>

                <Card
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-default-border bg-surface"
                >
                  <Stack spacing={3}>
                    <View className="flex-row items-center justify-between">
                      <View className="px-2.5 py-1 rounded-full bg-brand-light border border-brand/20">
                        <Text variant="caption" tone="brand" weight="bold">
                          VISIT CONFIRMED
                        </Text>
                      </View>
                      <Text variant="caption" tone="secondary">
                        Tomorrow, 11:30 AM
                      </Text>
                    </View>

                    <Stack spacing={1}>
                      <Text variant="title" tone="primary" weight="bold">
                        The Glasshouse Penthouse
                      </Text>
                      <Text variant="bodySmall" tone="secondary">
                        Indiranagar, Bengaluru • Owner: Direct Host
                      </Text>
                    </Stack>

                    <Text variant="caption" tone="muted" className="pt-1">
                      Our concierge has notified the verified owner. Direct
                      entry pass will be active 30 minutes prior.
                    </Text>
                  </Stack>
                </Card>

                <Card
                  variant="outlined"
                  padding="large"
                  radius="large"
                  className="border-dashed border-default-border"
                >
                  <EmptyState
                    title="No Pending Inquiries"
                    description="When you schedule visits or request property information, active statuses update here in real-time."
                    actionLabel="Discover More Homes"
                    onAction={() => router.push(ROUTES.DISCOVER as any)}
                  />
                </Card>
              </Stack>
            </ScrollView>
          )}
        </View>
      </View>
    </AppContainer>
  );
}
