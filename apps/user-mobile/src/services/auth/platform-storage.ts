import { Platform } from "react-native";

import * as SecureStore from "expo-secure-store";

async function getNativeItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

async function setNativeItem(
  key: string,
  value: string,
): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function deleteNativeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function getPlatformSecureItem(
  key: string,
): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  return getNativeItem(key);
}

export async function setPlatformSecureItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await setNativeItem(key, value);
}

export async function deletePlatformSecureItem(
  key: string,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await deleteNativeItem(key);
}