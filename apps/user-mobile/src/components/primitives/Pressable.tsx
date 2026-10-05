import { forwardRef } from "react";
import {
  Pressable as RNPressable,
  type Insets,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";

export type PressableProps = Omit<RNPressableProps, "style"> & {
  className?: string;
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  activeOpacity?: number;
};

const DEFAULT_HIT_SLOP: Insets = { top: 8, bottom: 8, left: 8, right: 8 };

export const Pressable = forwardRef<View, PressableProps>(function Pressable(
  {
    className = "",
    style,
    activeOpacity = 0.75,
    hitSlop = DEFAULT_HIT_SLOP,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <RNPressable
      ref={ref}
      disabled={disabled}
      hitSlop={hitSlop}
      style={(state) => {
        const customStyle = typeof style === "function" ? style(state) : style;
        if (state.pressed && !disabled && activeOpacity !== 1) {
          return [{ opacity: activeOpacity }, customStyle];
        }
        return customStyle;
      }}
      {...(className ? { className } : {})}
      {...props}
    />
  );
});
