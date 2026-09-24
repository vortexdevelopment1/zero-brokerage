export type AppEnvironment = "development" | "staging" | "production";

export type PublicAppConfig = {
  environment: AppEnvironment;
  apiBaseUrl: string;
};

export type SharedConfig = {
  app: PublicAppConfig;
};

export const DEFAULT_APP_ENVIRONMENT: AppEnvironment = "development";
