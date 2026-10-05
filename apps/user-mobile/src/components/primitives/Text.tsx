import { forwardRef } from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { colors, typography } from "@/theme/tokens";

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "bodyLarge"
  | "body"
  | "bodySmall"
  | "label"
  | "caption";

export type TextTone =
  | "primary"
  | "secondary"
  | "muted"
  | "inverse"
  | "brand"
  | "success"
  | "warning"
  | "error";

export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextAlign = "left" | "center" | "right";

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextWeight;
  align?: TextAlign;
  className?: string;
};

const variantClasses: Record<TextVariant, string> = {
  display: "text-display font-bold",
  h1: "text-h1 font-bold",
  h2: "text-h2 font-semibold",
  h3: "text-h3 font-semibold",
  title: "text-title font-semibold",
  bodyLarge: "text-body-large font-normal",
  body: "text-body font-normal",
  bodySmall: "text-body-small font-normal",
  label: "text-label font-semibold",
  caption: "text-caption font-normal",
};

const toneClasses: Record<TextTone, string> = {
  primary: "text-primary-content",
  secondary: "text-secondary-content",
  muted: "text-muted-content",
  inverse: "text-inverse-content",
  brand: "text-brand",
  success: "text-success-text",
  warning: "text-warning-text",
  error: "text-error-text",
};

const toneColors: Record<TextTone, string> = {
  primary: colors.primaryContent,
  secondary: colors.secondaryContent,
  muted: colors.mutedContent,
  inverse: colors.inverseContent,
  brand: colors.brand.DEFAULT,
  success: colors.success.text,
  warning: colors.warning.text,
  error: colors.error.text,
};

const weightClasses: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const weightMap: Record<TextWeight, TextStyle["fontWeight"]> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

const alignClasses: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const isHeadingVariant = (variant: TextVariant): boolean => {
  return (
    variant === "display" ||
    variant === "h1" ||
    variant === "h2" ||
    variant === "h3"
  );
};

export const Text = forwardRef<RNText, TextProps>(function Text(
  {
    variant = "body",
    tone = "primary",
    weight,
    align,
    className = "",
    accessibilityRole,
    style,
    ...props
  },
  ref,
) {
  const role =
    accessibilityRole ?? (isHeadingVariant(variant) ? "header" : undefined);

  const classes = [
    variantClasses[variant],
    toneClasses[tone],
    weight ? weightClasses[weight] : "",
    align ? alignClasses[align] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const tokenStyle: TextStyle = {
    ...typography[variant],
    color: toneColors[tone],
    ...(weight ? { fontWeight: weightMap[weight] } : {}),
    ...(align ? { textAlign: align } : {}),
  };

  return (
    <RNText
      ref={ref}
      accessibilityRole={role}
      style={[tokenStyle, style]}
      {...props}
    />
  );
});
