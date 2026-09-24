import { Text, View } from "react-native";

import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { AuthEntryContainer } from "@/features/auth/screens/AuthEntryContainer";
import { useAuthStore } from "@/services/auth";

export function AuthGate() {
  const status = useAuthStore((state) => state.status);

  if (
    status === "INITIALIZING" ||
    status === "RESTORING_SESSION"
  ) {
    return <AuthLoadingScreen />;
  }

  if (status === "GUEST" || status === "SESSION_EXPIRED") {
    return <AuthEntryContainer />;
  }

  if (status === "ONBOARDING_REQUIRED") {
    return (
      <View className="flex-1">
        <Text className="text-gray-900">
          Onboarding will be connected here.
        </Text>
      </View>
    );
  }

  if (status === "AUTHENTICATED") {
    return (
      <View className="flex-1">
        <Text className="text-gray-900">
          User app will be connected here.
        </Text>
      </View>
    );
  }

  if (
    status === "OTP_REQUESTING" ||
    status === "OTP_REQUIRED" ||
    status === "VERIFYING"
  ) {
    return (
      <View className="flex-1">
        <Text className="text-gray-900">
          Authentication verification will be connected here.
        </Text>
      </View>
    );
  }

  if (status === "LOGGING_OUT") {
    return <AuthLoadingScreen />;
  }

  return (
    <View className="flex-1">
      <Text className="text-gray-900">
        Something went wrong.
      </Text>
    </View>
  );
}