import { forwardRef } from "react";
import { View, type ViewProps } from "react-native";

export type BoxProps = ViewProps & {
  className?: string;
};

export const Box = forwardRef<View, BoxProps>(function Box(
  { className = "", style, ...props },
  ref,
) {
  return <View ref={ref} className={className} style={style} {...props} />;
});
