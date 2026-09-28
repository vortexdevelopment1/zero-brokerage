/**
 * API Contract Types for Zero Brokerage User Mobile
 * Authoritative source: Shared Core Backend identity & auth contracts
 */

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  token?: string | null;
  skipAuthRefresh?: boolean;
};

export type ApiRequestResult<T> = {
  data: T;
  status: number;
  headers: Headers;
};

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    timestamp?: string;
    requestId?: string;
  };
};

export type PlatformRole =
  | "USER"
  | "INDEPENDENT_BROKER"
  | "AGENCY_BROKER"
  | "AGENCY_ADMIN"
  | "SUPER_ADMIN";

export type UserStatus =
  "ACTIVE" | "SUSPENDED" | "DELETION_PENDING" | "DELETED";

export type OtpPurpose =
  "AUTHENTICATION" | "CHANGE_PHONE" | "SENSITIVE_ACTION" | "ACCOUNT_DELETION";

// Request / Response DTOs
export type RequestOtpRequest = {
  phone: string;
  purpose?: OtpPurpose;
};

export type RequestOtpResponse = {
  challengeId: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
};

export type VerifyOtpRequest = {
  challengeId: string;
  code: string;
  deviceInfo?: string;
};

export type UserTokens = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  tokenType: "Bearer";
};

export type VerifyOtpResponse = {
  user: {
    id: string;
    phone: string;
    role: PlatformRole;
    status: UserStatus;
  };
  tokens: UserTokens;
  isNewUser: boolean;
};

export type RefreshSessionRequest = {
  refreshToken: string;
};

export type RefreshSessionResponse = UserTokens;

export type CurrentUserProfileResponse = {
  user: {
    id: string;
    phone: string;
    role: PlatformRole;
    status: UserStatus;
    createdAt: string;
  };
  profile: {
    fullName: string | null;
    email: string | null;
    avatarUrl: string | null;
    preferences: Record<string, unknown>;
  } | null;
  permissions: string[];
  agencyMemberships: {
    agencyId: string;
    role: string;
    status: string;
  }[];
  brokerVerification: {
    status: string;
    licenseNumber: string | null;
  } | null;
};

export type LogoutResponse = {
  message: string;
};
