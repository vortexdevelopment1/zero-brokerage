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

export type IconButtonVariant =
  "primary" | "secondary" | "tertiary" | "destructive";
export type IconButtonSize = "small" | "medium" | "large";

export type IconButtonProps = {
  icon: React.ReactNode;
  /**
   * Accessible description of the button action. Mandatory for screen reader accessibility.
   */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<IconButtonVariant, ViewStyle> = {
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

const disabledVariantStyles: Record<IconButtonVariant, ViewStyle> = {
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

const sizeStyles: Record<IconButtonSize, ViewStyle> = {
  small: { width: 36, height: 36, borderRadius: 8 },
  medium: { width: 44, height: 44, borderRadius: 12 },
  large: { width: 52, height: 52, borderRadius: 16 },
};

const variantContainerClasses: Record<IconButtonVariant, string> = {
  primary: "bg-brand border border-transparent active:bg-brand-dark",
  secondary: "bg-surface border border-default-border active:bg-surface-muted",
  tertiary: "bg-transparent border border-transparent active:bg-surface-muted",
  destructive: "bg-error border border-transparent active:opacity-90",
};

const disabledVariantClasses: Record<IconButtonVariant, string> = {
  primary: "bg-disabled-background border-transparent",
  secondary: "bg-disabled-background border-disabled-border",
  tertiary: "bg-transparent border-transparent",
  destructive: "bg-disabled-background border-transparent",
};

const sizeContainerClasses: Record<IconButtonSize, string> = {
  small: "w-[36px] h-[36px] rounded-medium",
  medium: "w-[44px] h-[44px] rounded-large",
  large: "w-[52px] h-[52px] rounded-extra-large",
};

const sizeHitSlop: Record<IconButtonSize, Insets | undefined> = {
  // 36px + 4px on each side = 44px minimum touch target
  small: { top: 4, bottom: 4, left: 4, right: 4 },
  medium: undefined,
  large: undefined,
};

const variantIndicatorColors: Record<IconButtonVariant, string> = {
  primary: colors.inverseContent,
  secondary: colors.primaryContent,
  tertiary: colors.brand.primary,
  destructive: colors.inverseContent,
};

export const IconButton = forwardRef<View, IconButtonProps>(function IconButton(
  {
    icon,
    accessibilityLabel,
    accessibilityHint,
    onPress,
    variant = "secondary",
    size = "medium",
    loading = false,
    disabled = false,
    className = "",
    style,
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const containerClasses = [
    "items-center justify-center",
    sizeContainerClasses[size],
    isDisabled
      ? disabledVariantClasses[variant]
      : variantContainerClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const tokenContainerStyle: ViewStyle = {
    alignItems: "center",
    justifyContent: "center",
    ...sizeStyles[size],
    ...(isDisabled ? disabledVariantStyles[variant] : variantStyles[variant]),
  };

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={sizeHitSlop[size]}
      onPress={onPress}
      className={containerClasses}
      style={[tokenContainerStyle, style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            isDisabled
              ? colors.disabled.content
              : variantIndicatorColors[variant]
          }
        />
      ) : (
        icon
      )}
    </Pressable>
  );
});
