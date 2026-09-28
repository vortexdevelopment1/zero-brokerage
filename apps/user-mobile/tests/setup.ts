import Module from "node:module";

process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";

const memoryStore = new Map<string, string>();

// Monkey-patch require for node test environment
// @ts-ignore
const origRequire = Module.prototype.require;
// @ts-ignore
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === "react-native") {
    return {
      Platform: { OS: "ios" },
    };
  }
  if (id === "expo-secure-store") {
    return {
      getItemAsync: async (k: string) => memoryStore.get(k) ?? null,
      setItemAsync: async (k: string, v: string) => {
        memoryStore.set(k, v);
      },
      deleteItemAsync: async (k: string) => {
        memoryStore.delete(k);
      },
    };
  }
  return origRequire.apply(this, [id, ...args]);
};
