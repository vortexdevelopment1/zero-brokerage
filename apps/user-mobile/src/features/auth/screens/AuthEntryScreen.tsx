import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Pressable, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";
import { colors } from "@/theme/tokens";

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
  const [isFocused, setIsFocused] = useState(false);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  return (
    <AppContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        className="flex-1 bg-surface"
      >
        {/* Navigation Bar */}
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-subtle-border">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            onPress={handleBack}
            className="flex-row items-center py-1.5 px-3 rounded-full bg-surface-muted border border-default-border active:opacity-70"
          >
            <Text variant="bodySmall" tone="secondary" weight="semibold">
              ← Discover
            </Text>
          </Pressable>
          <View className="w-16" />
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1 px-6 pt-8 pb-8"
        >
          <Stack spacing={8} className="flex-1 justify-between">
            <Stack spacing={6}>
              {/* Header */}
              <Stack spacing={2}>
                <Text
                  variant="label"
                  tone="brand"
                  weight="bold"
                  className="tracking-widest uppercase text-[10px]"
                >
                  ZERO BROKERAGE ACCOUNT
                </Text>
                <Text variant="display" tone="primary" weight="bold">
                  Welcome
                </Text>
                <Text variant="bodyLarge" tone="secondary">
                  Direct verified communication between property owners and
                  residents.
                </Text>
              </Stack>

              {/* Phone Input Card */}
              <Stack spacing={3}>
                <Text variant="label" tone="primary" weight="semibold">
                  Mobile Number
                </Text>

                <View
                  className={[
                    "flex-row items-center rounded-large border bg-surface px-4 py-3.5 transition-all",
                    errorMessage
                      ? "border-error"
                      : isFocused
                        ? "border-brand bg-surface shadow-sm"
                        : "border-default-border bg-surface-muted",
                  ].join(" ")}
                >
                  <View className="flex-row items-center border-r border-default-border pr-3 mr-3">
                    <Text variant="body" tone="primary" weight="semibold">
                      🇮🇳 +91
                    </Text>
                  </View>

                  <TextInput
                    value={phoneNumber}
                    onChangeText={onPhoneNumberChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    placeholder="98765 43210"
                    placeholderTextColor={colors.mutedContent}
                    editable={!isLoading}
                    maxLength={15}
                    accessibilityLabel="Mobile phone number"
                    accessibilityHint="Enter your 10-digit mobile number"
                    className="flex-1 text-[16px] text-primary-content py-0"
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
                    We will send a 6-digit verification code via secure SMS.
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
                By continuing, you agree to the Zero Brokerage Terms of Service
                and Privacy Policy. Zero spam, zero broker commissions.
              </Text>
            </Box>
          </Stack>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppContainer>
  );
}
