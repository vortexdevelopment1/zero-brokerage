import React from "react";

import { AppContainer } from "@/components/AppContainer";
import { LoadingState } from "@/components/feedback";

export function AuthLoadingScreen() {
  return (
    <AppContainer>
      <LoadingState
        message="Loading your account..."
        description="Please wait while we secure and verify your session."
        fullScreen
      />
    </AppContainer>
  );
}
