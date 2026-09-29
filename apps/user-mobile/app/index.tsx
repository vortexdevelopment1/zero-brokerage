/**
 * Root Entry Point
 *
 * Routes user according to auth lifecycle:
 * - INITIALIZING / RESTORING_SESSION: AuthLoadingScreen
 * - ONBOARDING_REQUIRED: OnboardingContainer
 * - OTP_REQUIRED / VERIFYING: OtpVerificationContainer
 * - AUTHENTICATED / GUEST: Primary App Shell (Discover)
 */

import React from "react";
import { Redirect } from "expo-router";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { OnboardingContainer } from "@/features/auth/screens/OnboardingContainer";
import { OtpVerificationContainer } from "@/features/auth/screens/OtpVerificationContainer";
import { useAuthStore } from "@/services/auth";
import { ROUTES } from "@/navigation/routes";

export default function Index() {
  const status = useAuthStore((state) => state.status);

  if (
    status === "INITIALIZING" ||
    status === "RESTORING_SESSION" ||
    status === "LOGGING_OUT"
  ) {
    return <AuthLoadingScreen />;
  }

  if (
    status === "OTP_REQUESTING" ||
    status === "OTP_REQUIRED" ||
    status === "VERIFYING"
  ) {
    return <OtpVerificationContainer />;
  }

  if (status === "ONBOARDING_REQUIRED") {
    return <OnboardingContainer />;
  }

  // Both Authenticated and Guest users land on the Discover App Shell
  return <Redirect href={ROUTES.DISCOVER as any} />;
}
