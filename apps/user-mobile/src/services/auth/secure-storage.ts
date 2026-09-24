import {
  deletePlatformSecureItem,
  getPlatformSecureItem,
  setPlatformSecureItem,
} from "./platform-storage";

const ACCESS_TOKEN_KEY = "zero_brokerage.auth.access_token";
const REFRESH_TOKEN_KEY = "zero_brokerage.auth.refresh_token";

export async function setAccessToken(token: string): Promise<void> {
  await setPlatformSecureItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  return getPlatformSecureItem(ACCESS_TOKEN_KEY);
}

export async function deleteAccessToken(): Promise<void> {
  await deletePlatformSecureItem(ACCESS_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await setPlatformSecureItem(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getPlatformSecureItem(REFRESH_TOKEN_KEY);
}

export async function deleteRefreshToken(): Promise<void> {
  await deletePlatformSecureItem(REFRESH_TOKEN_KEY);
}

export async function clearAuthCredentials(): Promise<void> {
  await Promise.all([
    deleteAccessToken(),
    deleteRefreshToken(),
  ]);
}