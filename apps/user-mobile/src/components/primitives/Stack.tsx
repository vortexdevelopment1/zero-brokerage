import { forwardRef } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";

export type StackSpacing = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify =
  "start" | "center" | "end" | "between" | "around" | "evenly";

export type StackProps = ViewProps & {
  direction?: "vertical" | "horizontal";
  spacing?: StackSpacing;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  className?: string;
};

const spacingClasses: Record<StackSpacing, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
};

const alignClasses: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClasses: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const alignMap: Record<StackAlign, ViewStyle["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const justifyMap: Record<StackJustify, ViewStyle["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

export const Stack = forwardRef<View, StackProps>(function Stack(
  {
    direction = "vertical",
    spacing,
    align,
    justify,
    wrap = false,
    className = "",
    style,
    ...props
  },
  ref,
) {
  const classes = [
    direction === "horizontal" ? "flex-row" : "flex-col",
    spacing !== undefined ? spacingClasses[spacing] : "",
    align !== undefined ? alignClasses[align] : "",
    justify !== undefined ? justifyClasses[justify] : "",
    wrap ? "flex-wrap" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const tokenStyle: ViewStyle = {
    flexDirection: direction === "horizontal" ? "row" : "column",
    ...(spacing !== undefined ? { gap: spacing * 4 } : {}),
    ...(align ? { alignItems: alignMap[align] } : {}),
    ...(justify ? { justifyContent: justifyMap[justify] } : {}),
    ...(wrap ? { flexWrap: "wrap" } : {}),
  };

  return <View ref={ref} className={classes} style={[tokenStyle, style]} {...props} />;
});
