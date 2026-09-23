import { Text, View } from "react-native";

import { AppContainer } from "@/components/AppContainer";

export default function HomeScreen() {
  return (
    <AppContainer>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-gray-900">
          Zero Brokerage
        </Text>

        <Text className="mt-3 text-center text-base text-gray-500">
          User Mobile App Foundation
        </Text>
      </View>
    </AppContainer>
  );
}