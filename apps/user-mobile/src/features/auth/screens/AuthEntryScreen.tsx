import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Stack, Text } from "@/components/primitives";

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1 px-6 pt-12 pb-8"
        >
          <Stack spacing={8} className="flex-1 justify-between">
            <Stack spacing={6}>
              {/* Header */}
              <Stack spacing={2}>
                <Text
                  variant="label"
                  tone="brand"
                  className="tracking-widest uppercase"
                >
                  Zero Brokerage
                </Text>
                <Text variant="display" tone="primary" weight="bold">
                  Welcome
                </Text>
                <Text variant="bodyLarge" tone="secondary">
                  Sign in or create an account with your mobile number to get
                  started.
                </Text>
              </Stack>

              {/* Phone Input Card */}
              <Stack spacing={3}>
                <Text variant="label" tone="primary">
                  Mobile Number
                </Text>

                <View className="flex-row items-center rounded-large border border-default-border bg-surface px-4 py-3.5 focus:border-brand">
                  <View className="flex-row items-center border-r border-default-border pr-3 mr-3">
                    <Text variant="body" tone="primary" weight="semibold">
                      +91
                    </Text>
                  </View>

                  <TextInput
                    value={phoneNumber}
                    onChangeText={onPhoneNumberChange}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    placeholder="98765 43210"
                    placeholderTextColor="#A1A1AA"
                    editable={!isLoading}
                    maxLength={15}
                    accessibilityLabel="Mobile phone number"
                    accessibilityHint="Enter your 10-digit mobile number"
                    className="flex-1 text-[16px] text-primary-content"
                  />
                </View>

                {errorMessage ? (
                  <Text
                    variant="bodySmall"
                    tone="error"
                    accessibilityRole="alert"
                  >
                    {errorMessage}
                  </Text>
                ) : (
                  <Text variant="caption" tone="muted">
                    We will send a 6-digit verification code via SMS.
                  </Text>
                )}

                <Box className="mt-4">
                  <Button
                    label="Get Verification Code"
                    onPress={onContinue}
                    variant="primary"
                    size="large"
                    loading={isLoading}
                    loadingLabel="Requesting code..."
                    disabled={isLoading || !phoneNumber.trim()}
                    fullWidth
                  />
                </Box>
              </Stack>
            </Stack>

            {/* Legal / Policy note */}
            <Box className="pt-8">
              <Text variant="caption" tone="muted" align="center">
                By continuing, you agree to our Terms of Service and Privacy
                Policy. Standard carrier messaging rates may apply.
              </Text>
            </Box>
          </Stack>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppContainer>
  );
}
