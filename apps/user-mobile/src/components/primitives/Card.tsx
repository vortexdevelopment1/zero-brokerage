import React, { forwardRef } from "react";
import {
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { colors, elevation } from "@/theme/tokens";
import { Pressable } from "./Pressable";

export type CardVariant = "elevated" | "outlined" | "flat";
export type CardPadding = "none" | "small" | "medium" | "large";
export type CardRadius = "medium" | "large" | "extraLarge";

export type CardProps = ViewProps & {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  className?: string;
  children?: React.ReactNode;
};

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  small: "p-3",
  medium: "p-4",
  large: "p-6",
};

const radiusClasses: Record<CardRadius, string> = {
  medium: "rounded-medium",
  large: "rounded-large",
  extraLarge: "rounded-extra-large",
};

const variantClasses: Record<CardVariant, string> = {
  elevated: "bg-surface border border-subtle-border",
  outlined: "bg-surface border border-default-border",
  flat: "bg-muted-surface border border-transparent",
};

const variantStyles: Record<CardVariant, ViewStyle> = {
  elevated: {
    backgroundColor: colors.surface,
    borderColor: colors.subtleBorder,
    borderWidth: 1,
    ...elevation.low,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderColor: colors.defaultBorder,
    borderWidth: 1,
  },
  flat: {
    backgroundColor: colors.mutedSurface,
    borderColor: "transparent",
    borderWidth: 1,
  },
};

const paddingStyles: Record<CardPadding, ViewStyle> = {
  none: { padding: 0 },
  small: { padding: 12 },
  medium: { padding: 16 },
  large: { padding: 24 },
};

const radiusStyles: Record<CardRadius, ViewStyle> = {
  medium: { borderRadius: 8 },
  large: { borderRadius: 12 },
  extraLarge: { borderRadius: 16 },
};

export const Card = forwardRef<View, CardProps>(function Card(
  {
    variant = "outlined",
    padding = "medium",
    radius = "large",
    onPress,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    className = "",
    style,
    children,
    ...props
  },
  ref,
) {
  const containerClasses = [
    variantClasses[variant],
    paddingClasses[padding],
    radiusClasses[radius],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const combinedStyle: StyleProp<ViewStyle> = [
    variantStyles[variant],
    paddingStyles[padding],
    radiusStyles[radius],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? "button"}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        className={containerClasses}
        style={combinedStyle}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      ref={ref}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      className={containerClasses}
      style={combinedStyle}
      {...props}
    >
      {children}
    </View>
  );
});
