import type {
  AppEnvironment,
  PublicAppConfig,
} from "@zero-brokerage/config";

const environment = process.env.EXPO_PUBLIC_APP_ENVIRONMENT;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

function resolveEnvironment(): AppEnvironment {
  if (
    environment === "development" ||
    environment === "staging" ||
    environment === "production"
  ) {
    return environment;
  }

  return "development";
}

function resolveApiBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is required for the User Mobile App.",
    );
  }

  return apiBaseUrl.replace(/\/+$/, "");
}

export const appConfig: PublicAppConfig = {
  environment: resolveEnvironment(),
  apiBaseUrl: resolveApiBaseUrl(),
};