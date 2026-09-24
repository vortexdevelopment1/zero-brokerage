import { ActivityIndicator, Text, View } from "react-native";

import { AppContainer } from "@/components/AppContainer";

export function AuthLoadingScreen() {
  return (
    <AppContainer>
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator size="large" />

        <Text className="mt-4 text-base font-medium text-gray-900">
          Loading your account...
        </Text>

        <Text className="mt-2 text-center text-sm text-gray-500">
          Please wait while we restore your session.
        </Text>
      </View>
    </AppContainer>
  );
}