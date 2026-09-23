import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

type AppContainerProps = {
  children: ReactNode;
};

export function AppContainer({ children }: AppContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {children}
    </SafeAreaView>
  );
}