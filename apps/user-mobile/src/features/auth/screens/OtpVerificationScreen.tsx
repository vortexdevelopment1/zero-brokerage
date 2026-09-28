import React, { useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Pressable, Stack, Text } from "@/components/primitives";

import { maskPhoneNumber } from "../utils/phone-validation";

type OtpVerificationScreenProps = {
  phoneNumber: string;
  code: string;
  onCodeChange: (code: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onChangePhoneNumber: () => void;
  isVerifying?: boolean;
  isResending?: boolean;
  countdownSeconds: number;
  errorMessage: string | null;
};

export function OtpVerificationScreen({
  phoneNumber,
  code,
  onCodeChange,
  onVerify,
  onResend,
  onChangePhoneNumber,
  isVerifying = false,
  isResending = false,
  countdownSeconds,
  errorMessage,
}: OtpVerificationScreenProps) {
  const inputRef = useRef<TextInput>(null);

  const formattedCountdown = `${Math.floor(countdownSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(countdownSeconds % 60).toString().padStart(2, "0")}`;

  function handleCellPress() {
    inputRef.current?.focus();
  }

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
                  Verification
                </Text>
                <Text variant="display" tone="primary" weight="bold">
                  Enter Code
                </Text>
                <Text variant="bodyLarge" tone="secondary">
                  We sent a 6-digit code to{" "}
                  <Text variant="bodyLarge" tone="primary" weight="semibold">
                    {maskPhoneNumber(phoneNumber)}
                  </Text>
                </Text>
                <Box>
                  <Pressable
                    onPress={onChangePhoneNumber}
                    accessibilityRole="button"
                    accessibilityLabel="Change phone number"
                    className="self-start pt-1"
                  >
                    <Text variant="bodySmall" tone="brand" weight="medium">
                      Change phone number
                    </Text>
                  </Pressable>
                </Box>
              </Stack>

              {/* 6-Digit OTP Cells */}
              <Stack spacing={4}>
                <RNPressable
                  onPress={handleCellPress}
                  accessibilityLabel="6-digit verification code input"
                  accessibilityHint="Tap to enter the 6-digit code sent to your phone"
                  className="flex-row justify-between"
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = code[index] || "";
                    const isFocused = code.length === index;

                    return (
                      <View
                        key={index}
                        className={`h-14 w-12 items-center justify-center rounded-large border bg-surface ${
                          errorMessage
                            ? "border-error"
                            : isFocused
                              ? "border-brand border-2"
                              : digit
                                ? "border-primary-content"
                                : "border-default-border"
                        }`}
                      >
                        <Text variant="h2" tone="primary" weight="semibold">
                          {digit}
                        </Text>
                      </View>
                    );
                  })}
                </RNPressable>

                {/* Hidden accessible input that captures keystrokes and paste */}
                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/\D/g, "").slice(0, 6);
                    onCodeChange(cleaned);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  style={{
                    position: "absolute",
                    opacity: 0.01,
                    width: 1,
                    height: 1,
                  }}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />

                {errorMessage ? (
                  <Text
                    variant="bodySmall"
                    tone="error"
                    accessibilityRole="alert"
                  >
                    {errorMessage}
                  </Text>
                ) : null}

                {/* Verify Button */}
                <Box className="mt-2">
                  <Button
                    label="Verify & Continue"
                    onPress={onVerify}
                    variant="primary"
                    size="large"
                    loading={isVerifying}
                    loadingLabel="Verifying code..."
                    disabled={isVerifying || code.length !== 6}
                    fullWidth
                  />
                </Box>
              </Stack>

              {/* Resend OTP Section */}
              <Stack align="center" spacing={2} className="pt-2">
                {countdownSeconds > 0 ? (
                  <Text variant="bodySmall" tone="secondary">
                    Resend code in{" "}
                    <Text variant="bodySmall" tone="primary" weight="medium">
                      {formattedCountdown}
                    </Text>
                  </Text>
                ) : (
                  <Button
                    label="Resend Code"
                    onPress={onResend}
                    variant="tertiary"
                    size="small"
                    loading={isResending}
                    disabled={isResending}
                  />
                )}
              </Stack>
            </Stack>

            {/* Security note */}
            <Box className="pt-8">
              <Text variant="caption" tone="muted" align="center">
                Never share this verification code with anyone. Our support team
                will never ask for your code.
              </Text>
            </Box>
          </Stack>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppContainer>
  );
}
