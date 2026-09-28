import React, { forwardRef } from "react";
import {
  ActivityIndicator,
  View,
  type GestureResponderEvent,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "@/theme/tokens";
import { Pressable } from "./Pressable";
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

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={sizeHitSlop[size]}
      onPress={onPress}
      className={containerClasses}
      style={style}
    >
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
    </Pressable>
  );
});
