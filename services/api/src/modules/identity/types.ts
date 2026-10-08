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

export type OtpStatus =
  "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED" | "SUPERSEDED";

export type AgencyMembershipRole =
  | "ADMIN"
  | "MANAGER"
  | "BROKER"
  | "MEMBER"
  | "AGENCY_OWNER";

export type AgencyMembershipStatus =
  "ACTIVE" | "INVITED" | "SUSPENDED" | "TERMINATED";

export type BrokerVerificationStatus =
  | "UNSUBMITTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "REVERIFICATION_REQUIRED";

export type SecurityEventType =
  | "OTP_REQUESTED"
  | "OTP_VERIFIED"
  | "OTP_FAILED"
  | "SESSION_CREATED"
  | "SESSION_REVOKED"
  | "LOGOUT_ALL"
  | "PHONE_CHANGE_REQUESTED"
  | "PHONE_CHANGED"
  | "ACCOUNT_DELETION_REQUESTED"
  | "ACCOUNT_DELETION_CANCELLED"
  | "ACCOUNT_DELETED"
  | "ROLE_CHANGED"
  | "MEMBERSHIP_CHANGED"
  | "BROKER_VERIFICATION_DECISION"
  | "ADMIN_PRIVILEGE_USED"
  | "SUSPICIOUS_ACTIVITY";

export interface AuthIdentity {
  id: string;
  phone: string;
  status: UserStatus;
  role: PlatformRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletionScheduledAt: Date | null;
}

export interface UserProfile {
  userId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthOtpChallenge {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  status: OtpStatus;
  consumedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
  createdAt: Date;
}

export interface AgencyMembership {
  id: string;
  agencyId: string;
  userId: string;
  role: AgencyMembershipRole;
  status: AgencyMembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrokerVerification {
  id: string;
  userId: string;
  status: BrokerVerificationStatus;
  licenseNumber: string | null;
  documentUrls: string[];
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSecurityEvent {
  id: string;
  eventType: SecurityEventType;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: PlatformRole;
  status: UserStatus;
  sessionId: string;
}

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  tokenType: "Bearer";
}

export interface OtpRequestResult {
  challengeId: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
}

export interface SessionSummary {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

export interface CurrentUserProfileResponse {
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
    role: AgencyMembershipRole;
    status: AgencyMembershipStatus;
  }[];
  brokerVerification: {
    status: BrokerVerificationStatus;
    licenseNumber: string | null;
  } | null;
}

export interface AdminUserListItem {
  id: string;
  phone: string;
  role: PlatformRole;
  status: UserStatus;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminBrokerListItem {
  id: string;
  phone: string;
  role: PlatformRole;
  status: UserStatus;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  agencyName: string | null;
  verificationStatus: BrokerVerificationStatus;
  licenseNumber: string | null;
  documentUrls: string[];
  rejectionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
