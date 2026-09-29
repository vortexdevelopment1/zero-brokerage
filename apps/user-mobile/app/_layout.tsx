import "../global.css";

import React from "react";
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
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="furniture/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
