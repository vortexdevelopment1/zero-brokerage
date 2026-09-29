/**
 * Sign In Screen
 *
 * Integrates Milestone 02 AuthGate inside the auth stack.
 * Upon successful authentication, returns user to the primary App Shell.
 */

import React, { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/primitives";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";

export default function SignInScreen() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "AUTHENTICATED") {
      router.replace(ROUTES.DISCOVER as any);
    }
  }, [status]);

  function handleDismiss() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  return (
    <View className="flex-1 bg-surface">
      {/* Top dismiss bar for guest users */}
      <View className="pt-4 px-4 flex-row justify-end">
        <Button
          label="Cancel"
          variant="tertiary"
          size="small"
          onPress={handleDismiss}
          accessibilityLabel="Cancel sign in and return"
        />
      </View>

      <View className="flex-1">
        <AuthGate />
      </View>
    </View>
  );
}
