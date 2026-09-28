import React from "react";
import { View, type ViewProps } from "react-native";
import { Button } from "../primitives/Button";
import { Stack } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type EmptyStateProps = ViewProps & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  style,
  ...props
}: EmptyStateProps) {
  const containerClasses = ["items-center justify-center p-8 py-12", className]
    .filter(Boolean)
    .join(" ");

  return (
    <View
      accessibilityRole="summary"
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
          {description ? (
            <Text variant="body" tone="secondary" align="center">
              {description}
            </Text>
          ) : null}
        </Stack>

        {actionLabel && onAction ? (
          <Stack align="center" spacing={2} className="w-full mt-2">
            <Button
              label={actionLabel}
              onPress={onAction}
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
