import React, { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable as RNPressable,
  View,
  type GestureResponderEvent,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "@/theme/tokens";
import { Text } from "./Text";

export type ButtonVariant =
  "primary" | "secondary" | "tertiary" | "destructive";
export type ButtonSize = "small" | "medium" | "large";

export type ButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: "transparent",
    borderWidth: 1,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.defaultBorder,
    borderWidth: 1,
  },
  tertiary: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 1,
  },
  destructive: {
    backgroundColor: colors.error.DEFAULT,
    borderColor: "transparent",
    borderWidth: 1,
  },
};

const disabledVariantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.disabled.background,
    borderColor: "transparent",
    borderWidth: 1,
  },
  secondary: {
    backgroundColor: colors.disabled.background,
    borderColor: colors.disabled.border,
    borderWidth: 1,
  },
  tertiary: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 1,
  },
  destructive: {
    backgroundColor: colors.disabled.background,
    borderColor: "transparent",
    borderWidth: 1,
  },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  small: {
    height: 40,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  medium: {
    height: 48,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  large: {
    height: 56,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
};

const variantContainerClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand border border-transparent active:bg-brand-dark",
  secondary: "bg-surface border border-default-border active:bg-surface-muted",
  tertiary: "bg-transparent border border-transparent active:bg-surface-muted",
  destructive: "bg-error border border-transparent active:opacity-90",
};

const disabledVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-disabled-background border-transparent",
  secondary: "bg-disabled-background border-disabled-border",
  tertiary: "bg-transparent border-transparent",
  destructive: "bg-disabled-background border-transparent",
};

const sizeContainerClasses: Record<ButtonSize, string> = {
  small: "min-h-[40px] px-3.5 rounded-medium",
  medium: "min-h-[48px] px-5 rounded-large",
  large: "min-h-[56px] px-6 rounded-extra-large",
};

const sizeHitSlop: Record<ButtonSize, Insets | undefined> = {
  // 40px min-height + 4px top/bottom ensures compliant >= 44pt touch target
  small: { top: 4, bottom: 4, left: 4, right: 4 },
  medium: undefined,
  large: undefined,
};

const variantIndicatorColors: Record<ButtonVariant, string> = {
  primary: colors.inverseContent,
  secondary: colors.primaryContent,
  tertiary: colors.brand.primary,
  destructive: colors.inverseContent,
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    onPress,
    variant = "primary",
    size = "medium",
    loading = false,
    loadingLabel,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    accessibilityLabel,
    accessibilityHint,
    className = "",
    style,
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const textTone = isDisabled
    ? "muted"
    : variant === "primary" || variant === "destructive"
      ? "inverse"
      : variant === "tertiary"
        ? "brand"
        : "primary";

  const textVariant =
    size === "large" ? "bodyLarge" : size === "small" ? "label" : "body";

  const containerClasses = [
    "flex-row items-center justify-center gap-2",
    sizeContainerClasses[size],
    isDisabled
      ? disabledVariantClasses[variant]
      : variantContainerClasses[variant],
    fullWidth ? "w-full" : "self-start",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const tokenContainerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexShrink: 0,
    overflow: "hidden",
    ...sizeStyles[size],
    ...(isDisabled ? disabledVariantStyles[variant] : variantStyles[variant]),
    ...(fullWidth ? { width: "100%" } : { alignSelf: "flex-start" }),
  };

  return (
    <RNPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={sizeHitSlop[size]}
      onPress={onPress}
      style={({ pressed }) => [
        fullWidth ? { width: "100%" } : { alignSelf: "flex-start" },
        pressed && !isDisabled ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      <View style={tokenContainerStyle}>
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color={
                isDisabled
                  ? colors.disabled.content
                  : variantIndicatorColors[variant]
              }
            />
            {loadingLabel ? (
              <Text variant={textVariant} tone={textTone} weight="medium">
                {loadingLabel}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            {leftIcon}
            <Text variant={textVariant} tone={textTone} weight="semibold">
              {label}
            </Text>
            {rightIcon}
          </>
        )}
      </View>
    </RNPressable>
  );
});
