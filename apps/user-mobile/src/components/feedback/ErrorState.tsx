import React from "react";
import { View, type ViewProps } from "react-native";
import { Button } from "../primitives/Button";
import { Stack } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type ErrorStateProps = ViewProps & {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  icon,
  retryLabel = "Try Again",
  onRetry,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  style,
  ...props
}: ErrorStateProps) {
  const containerClasses = ["items-center justify-center p-8 py-12", className]
    .filter(Boolean)
    .join(" ");

  return (
    <View
      accessibilityRole="alert"
      className={containerClasses}
      style={style}
      {...props}
    >
      <Stack align="center" spacing={4} className="max-w-[320px]">
        {icon ? <View className="mb-1">{icon}</View> : null}
        <Stack align="center" spacing={2}>
          <Text variant="h3" tone="error" align="center" weight="semibold">
            {title}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            {message}
          </Text>
        </Stack>

        {onRetry ? (
          <Stack align="center" spacing={2} className="w-full mt-2">
            <Button
              label={retryLabel}
              onPress={onRetry}
              variant="primary"
              size="medium"
              fullWidth
            />
            {secondaryActionLabel && onSecondaryAction ? (
              <Button
                label={secondaryActionLabel}
                onPress={onSecondaryAction}
                variant="tertiary"
                size="small"
              />
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </View>
  );
}
