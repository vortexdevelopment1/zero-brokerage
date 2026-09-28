import React from "react";

import { logout, useAuthStore } from "@/services/auth";

import { OnboardingScreen } from "./OnboardingScreen";

export function OnboardingContainer() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  const isLoggingOut = status === "LOGGING_OUT";

  async function handleLogout() {
    await logout();
  }

  return (
    <OnboardingScreen
      phone={user?.phone}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    />
  );
}
