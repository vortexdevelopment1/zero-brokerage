import { type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";

export type AppContainerProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

export function AppContainer({
  children,
  className = "",
  style,
  edges = ["top", "bottom", "left", "right"],
}: AppContainerProps) {
  return (
    <SafeAreaView
      edges={edges}
      className={"flex-1 bg-canvas " + className}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </SafeAreaView>
  );
}
