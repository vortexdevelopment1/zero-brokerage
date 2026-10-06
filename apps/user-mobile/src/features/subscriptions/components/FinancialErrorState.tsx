/**
 * Financial Error & Recovery State Presentation (Step 9A)
 *
 * Enforces:
 * 1. Financial Safety: Never urges retry when payment status is uncertain.
 * 2. Privacy: Redacts infrastructure/provider diagnostic exceptions.
 * 3. Clear recovery guidance and support routing.
 */

import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";
import { mapFinancialErrorToPresentation } from "../utils/financial-errors";

interface FinancialErrorStateProps {
  readonly error: unknown;
  readonly onRetry?: () => void;
  readonly onSecondaryAction?: () => void;
}

export function FinancialErrorState({
  error,
  onRetry,
  onSecondaryAction,
}: FinancialErrorStateProps) {
  const presentation = mapFinancialErrorToPresentation(error);
  const {
    title,
    message,
    actionLabel,
    canRetry,
    requiresSupport,
    isPendingVerification,
  } = presentation;

  function handleAction() {
    if (isPendingVerification) {
      router.push(ROUTES.PAYMENT_HISTORY as any);
      return;
    }
    if (requiresSupport) {
      router.push(ROUTES.SUPPORT as any);
      return;
    }
    if (canRetry && onRetry) {
      onRetry();
      return;
    }
    if (onSecondaryAction) {
      onSecondaryAction();
      return;
    }
    router.replace(ROUTES.ACCOUNT as any);
  }

  return (
    <Card
      variant="outlined"
      padding="large"
      radius="large"
      className="border-default-border bg-surface my-4"
      accessibilityRole="alert"
      accessibilityLabel={`${title}: ${message}`}
    >
      <Stack spacing={4} className="items-center text-center py-2">
        <View
          className={`w-14 h-14 rounded-full items-center justify-center ${
            isPendingVerification
              ? "bg-amber-50 dark:bg-amber-950/40"
              : canRetry
                ? "bg-slate-100 dark:bg-slate-800"
                : "bg-rose-50 dark:bg-rose-950/40"
          }`}
        >
          <Text className="text-2xl">
            {isPendingVerification ? "🔍" : canRetry ? "🔄" : "⚠"}
          </Text>
        </View>

        <Stack spacing={2} className="items-center">
          <Text
            variant="h3"
            tone="primary"
            weight="bold"
            className="text-center"
          >
            {title}
          </Text>
          <Text
            variant="bodySmall"
            tone="secondary"
            className="text-center leading-5"
          >
            {message}
          </Text>
        </Stack>

        <View className="w-full pt-2">
          <Button
            label={actionLabel || "Acknowledge"}
            onPress={handleAction}
            variant={isPendingVerification ? "primary" : canRetry ? "primary" : "secondary"}
            size="medium"
            fullWidth
            accessibilityLabel={actionLabel || "Acknowledge message"}
          />
        </View>
      </Stack>
    </Card>
  );
}
