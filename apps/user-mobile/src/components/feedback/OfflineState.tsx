import React from "react";
import { View, type ViewProps } from "react-native";
import { Button } from "../primitives/Button";
import { Stack } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type OfflineStateProps = ViewProps & {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

export function OfflineState({
  title = "No Internet Connection",
  message = "Please check your network settings. Any changes made offline will not take effect until connectivity is restored.",
  icon,
  retryLabel = "Check Connection",
  onRetry,
  className = "",
  style,
  ...props
}: OfflineStateProps) {
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
          <Text variant="h3" tone="primary" align="center" weight="semibold">
            {title}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            {message}
          </Text>
        </Stack>

        {onRetry ? (
          <View className="w-full mt-2">
            <Button
              label={retryLabel}
              onPress={onRetry}
              variant="primary"
              size="medium"
              fullWidth
            />
          </View>
        ) : null}
      </Stack>
    </View>
  );
}
