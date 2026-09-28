import React from "react";
import { ActivityIndicator, View, type ViewProps } from "react-native";
import { colors } from "@/theme/tokens";
import { Stack } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type LoadingStateProps = ViewProps & {
  /**
   * Clear contextual message explaining what is being loaded (never indefinite without context).
   */
  message?: string;
  description?: string;
  fullScreen?: boolean;
  className?: string;
};

export function LoadingState({
  message = "Loading...",
  description,
  fullScreen = false,
  className = "",
  style,
  ...props
}: LoadingStateProps) {
  const containerClasses = [
    "items-center justify-center p-8",
    fullScreen ? "flex-1 min-h-[300px]" : "py-12",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      className={containerClasses}
      style={style}
      {...props}
    >
      <Stack align="center" spacing={3}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text variant="title" tone="primary" align="center" weight="medium">
          {message}
        </Text>
        {description ? (
          <Text variant="bodySmall" tone="secondary" align="center">
            {description}
          </Text>
        ) : null}
      </Stack>
    </View>
  );
}
