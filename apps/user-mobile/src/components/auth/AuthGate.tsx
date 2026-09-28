import React from "react";

import { AppContainer } from "@/components/AppContainer";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AuthEntryContainer } from "@/features/auth/screens/AuthEntryContainer";
import { AuthenticatedShell } from "@/features/auth/screens/AuthenticatedShell";
import { OnboardingContainer } from "@/features/auth/screens/OnboardingContainer";
import { OtpVerificationContainer } from "@/features/auth/screens/OtpVerificationContainer";
import { useAuthStore } from "@/services/auth";

export function AuthGate() {
  const status = useAuthStore((state) => state.status);
  const errorMessage = useAuthStore((state) => state.errorMessage);

  if (
    status === "INITIALIZING" ||
    status === "RESTORING_SESSION" ||
    status === "LOGGING_OUT"
  ) {
    return <AuthLoadingScreen />;
  }

  if (status === "GUEST" || status === "SESSION_EXPIRED") {
    return <AuthEntryContainer />;
  }

  if (status === "ONBOARDING_REQUIRED") {
    return <OnboardingContainer />;
  }

  if (status === "AUTHENTICATED") {
    return <AuthenticatedShell />;
  }

  if (
    status === "OTP_REQUESTING" ||
    status === "OTP_REQUIRED" ||
    status === "VERIFYING"
  ) {
    return <OtpVerificationContainer />;
  }

  return (
    <AppContainer>
      <ErrorState
        title="Authentication Issue"
        message={errorMessage || "Unable to complete authentication."}
        onRetry={() => useAuthStore.getState().restoreAsGuest()}
        retryLabel="Return to Sign In"
      />
    </AppContainer>
  );
}
