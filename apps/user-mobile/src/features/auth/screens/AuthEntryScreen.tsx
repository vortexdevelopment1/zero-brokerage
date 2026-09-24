import { Pressable, Text, TextInput, View } from "react-native";

import { AppContainer } from "@/components/AppContainer";

type AuthEntryScreenProps = {
  phoneNumber: string;
  errorMessage: string | null;
  onPhoneNumberChange: (value: string) => void;
  onContinue: () => void;
  isLoading?: boolean;
};

export function AuthEntryScreen({
  phoneNumber,
  errorMessage,
  onPhoneNumberChange,
  onContinue,
  isLoading = false,
}: AuthEntryScreenProps) {
  return (
    <AppContainer>
      <View className="flex-1 px-6 pt-16">
        <View>
          <Text className="text-3xl font-bold text-gray-900">
            Welcome
          </Text>

          <Text className="mt-3 text-base leading-6 text-gray-500">
            Sign in or create your account using your phone number.
          </Text>
        </View>

        <View className="mt-10">
          <Text className="mb-2 text-sm font-medium text-gray-900">
            Phone number
          </Text>

          <TextInput
            value={phoneNumber}
            onChangeText={onPhoneNumberChange}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="Enter your phone number"
            placeholderTextColor="#9CA3AF"
            editable={!isLoading}
            accessibilityLabel="Phone number"
            className={`rounded-xl border bg-white px-4 py-4 text-base text-gray-900 ${
              errorMessage ? "border-red-500" : "border-gray-300"
            }`}
          />

          {errorMessage ? (
            <Text
              accessibilityRole="alert"
              className="mt-2 text-sm text-red-600"
            >
              {errorMessage}
            </Text>
          ) : (
            <Text className="mt-2 text-xs leading-5 text-gray-500">
              We'll use this number to verify your account.
            </Text>
          )}
        </View>

        <View className="mt-8">
          <Pressable
            disabled={isLoading}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue with phone number"
            className={`items-center rounded-xl px-4 py-4 ${
              isLoading ? "bg-gray-300" : "bg-gray-900"
            }`}
          >
            <Text className="text-base font-semibold text-white">
              {isLoading ? "Please wait..." : "Continue"}
            </Text>
          </Pressable>
        </View>

        <View className="mt-auto pb-8">
          <Text className="text-center text-xs leading-5 text-gray-500">
            By continuing, you agree to the applicable terms and privacy
            policy.
          </Text>
        </View>
      </View>
    </AppContainer>
  );
}