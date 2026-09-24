import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";

export default function RootLayout() {
  useAuthBootstrap();

  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </>
  );
}