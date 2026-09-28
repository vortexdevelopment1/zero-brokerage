import type { Pool } from "pg";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  InvalidAccountStateError,
} from "../../../common/errors/index.js";
import { env } from "../../../config/env.js";
import { getRolePermissions } from "../authorization/roles-and-permissions.js";
import type { OtpDeliveryProvider } from "../providers/otp-provider.js";
import {
  anonymizeUserProfile,
  findAgencyMembershipsByUserId,
  findBrokerVerificationByUserId,
  findExpiredDeletionPendingIdentities,
  findIdentityById,
  findIdentityByPhone,
  findUserProfile,
  updateIdentityPhone,
  updateIdentityStatus,
} from "../repositories/identity-repository.js";

import {
  consumeOtpChallenge,
  createOtpChallenge,
  findChallengeById,
  incrementOtpAttempts,
} from "../repositories/otp-repository.js";
import { recordSecurityEvent } from "../repositories/security-event-repository.js";
import { revokeAllUserSessions } from "../repositories/session-repository.js";
import type { CurrentUserProfileResponse, OtpRequestResult } from "../types.js";
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from "../utils/crypto.js";
import { maskPhoneNumber, normalizePhoneNumber } from "../utils/phone.js";

export class AccountLifecycleService {
  constructor(
    private pool: Pool,
    private otpProvider: OtpDeliveryProvider,
  ) {}

  /**
   * Retrieves profile, role permissions, agency memberships, and broker verification state.
   */
  async getCurrentUserProfile(
    userId: string,
  ): Promise<CurrentUserProfileResponse> {
    const user = await findIdentityById(this.pool, userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    const [profile, agencyMemberships, brokerVerification] = await Promise.all([
      findUserProfile(this.pool, userId),
      findAgencyMembershipsByUserId(this.pool, userId),
      findBrokerVerificationByUserId(this.pool, userId),
    ]);

    const permissions = [...getRolePermissions(user.role)];

    return {
      user: {
        id: user.id,
        phone: maskPhoneNumber(user.phone),
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
      profile: profile
        ? {
            fullName: profile.fullName,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            preferences: profile.preferences,
          }
        : null,
      permissions,
      agencyMemberships: agencyMemberships.map((m) => ({
        agencyId: m.agencyId,
        role: m.role,
        status: m.status,
      })),
      brokerVerification: brokerVerification
        ? {
            status: brokerVerification.status,
            licenseNumber: brokerVerification.licenseNumber,
          }
        : null,
    };
  }

  /**
   * Initiates a change-of-phone request by delivering an OTP to the new phone number.
   */
  async requestPhoneChange(params: {
    userId: string;
    newPhone: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<OtpRequestResult> {
    const normalizedPhone = normalizePhoneNumber(params.newPhone);

    // Verify that the new phone number is not already associated with another active account
    const existing = await findIdentityByPhone(this.pool, normalizedPhone);
    if (existing && existing.id !== params.userId) {
      throw new ConflictError(
        "The requested phone number is already registered to another account.",
      );
    }

    const rawOtp = generateOtpCode();
    const codeHash = hashOtpCode(rawOtp, env.JWT_SECRET);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);

    const challenge = await createOtpChallenge(this.pool, {
      phone: normalizedPhone,
      purpose: "CHANGE_PHONE",
      codeHash,
      expiresAt,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await this.otpProvider.sendOtp(normalizedPhone, rawOtp, "CHANGE_PHONE");

    await recordSecurityEvent(this.pool, {
      eventType: "PHONE_CHANGE_REQUESTED",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        newPhone: maskPhoneNumber(normalizedPhone),
        challengeId: challenge.id,
      },
    });

    return {
      challengeId: challenge.id,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  /**
   * Confirms the phone change after OTP verification and revokes other active sessions.
   */
  async confirmPhoneChange(params: {
    userId: string;
    challengeId: string;
    code: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<void> {
    const challenge = await findChallengeById(this.pool, params.challengeId);
    if (!challenge || challenge.purpose !== "CHANGE_PHONE") {
      throw new NotFoundError("Phone change challenge not found or invalid.");
    }

    if (
      challenge.status !== "PENDING" ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedError(
        "Verification code has expired. Please try again.",
      );
    }

    const isMatch = verifyOtpCode(
      params.code,
      challenge.codeHash,
      env.JWT_SECRET,
    );
    if (!isMatch) {
      const { isFailed } = await incrementOtpAttempts(this.pool, challenge.id);
      if (isFailed) {
        throw new UnauthorizedError(
          "Maximum attempts exceeded. Challenge locked.",
        );
      }
      throw new UnauthorizedError("Invalid verification code.");
    }

    const consumed = await consumeOtpChallenge(this.pool, challenge.id);
    if (!consumed) {
      throw new UnauthorizedError("Challenge has already been consumed.");
    }

    // Update phone on auth identity
    await updateIdentityPhone(this.pool, params.userId, challenge.phone);

    // Security best practice: Revoke other sessions on sensitive phone number change
    await revokeAllUserSessions(this.pool, params.userId, "PHONE_CHANGED");

    await recordSecurityEvent(this.pool, {
      eventType: "PHONE_CHANGED",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        newPhone: maskPhoneNumber(challenge.phone),
      },
    });
  }

  /**
   * Executes account deletion lifecycle:
   * - Marks status as DELETION_PENDING with 30-day retention/grace period
   * - Anonymizes personal profile details (PII)
   * - Revokes all active sessions immediately
   * - Records security audit event
   */
  async deleteAccount(params: {
    userId: string;
    reason?: string | null | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<{ message: string; scheduledAt: string }> {
    const user = await findIdentityById(this.pool, params.userId);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }

    if (user.status === "DELETED") {
      throw new InvalidAccountStateError("Account is already deleted.");
    }

    if (user.status === "DELETION_PENDING") {
      return {
        message: "Account is already scheduled for deletion.",
        scheduledAt: user.deletionScheduledAt
          ? user.deletionScheduledAt.toISOString()
          : new Date().toISOString(),
      };
    }

    // 30 days retention window before permanent purge of non-financial data
    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await updateIdentityStatus(
      this.pool,
      params.userId,
      "DELETION_PENDING",
      scheduledAt,
    );

    // Anonymize PII from user profile immediately
    await anonymizeUserProfile(this.pool, params.userId);

    // Invalidate all active sessions with precise reason
    await revokeAllUserSessions(
      this.pool,
      params.userId,
      "ACCOUNT_DELETION_PENDING",
    );

    await recordSecurityEvent(this.pool, {
      eventType: "ACCOUNT_DELETION_REQUESTED",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        reason: params.reason ?? "User initiated account deletion",
        retentionExpiry: scheduledAt.toISOString(),
      },
    });

    return {
      message:
        "Your account has been scheduled for deletion and personal information has been anonymized. All active sessions have been terminated.",
      scheduledAt: scheduledAt.toISOString(),
    };
  }

  /**
   * Cancels account deletion during the allowed 30-day grace period.
   * Restores account status to ACTIVE. Does not restore permanently anonymized PII.
   */
  async cancelAccountDeletion(params: {
    userId: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<{ message: string }> {
    const user = await findIdentityById(this.pool, params.userId);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }

    if (user.status === "DELETED") {
      throw new InvalidAccountStateError(
        "Account is permanently deleted and cannot be restored.",
      );
    }

    if (user.status !== "DELETION_PENDING") {
      throw new InvalidAccountStateError(
        `Account is not pending deletion (current status: ${user.status}).`,
      );
    }

    if (
      user.deletionScheduledAt &&
      user.deletionScheduledAt.getTime() <= Date.now()
    ) {
      throw new InvalidAccountStateError(
        "The deletion grace period has expired. Account cannot be restored.",
      );
    }

    // Restore account status to ACTIVE and clear scheduled deletion timestamp
    await updateIdentityStatus(this.pool, params.userId, "ACTIVE", null);

    await recordSecurityEvent(this.pool, {
      eventType: "ACCOUNT_DELETION_CANCELLED",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        cancelledAt: new Date().toISOString(),
      },
    });

    return {
      message:
        "Account deletion has been cancelled and your account is active. Please update your profile information.",
    };
  }

  /**
   * Permanently finalizes deletion of an account whose retention schedule has expired.
   * Safe to execute repeatedly and idempotently.
   */
  async finalizeAccountDeletion(params: {
    userId: string;
    force?: boolean;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<{ message: string; alreadyDeleted?: boolean }> {
    const user = await findIdentityById(this.pool, params.userId);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }

    // Idempotent: already deleted
    if (user.status === "DELETED") {
      return {
        alreadyDeleted: true,
        message: "Account is already permanently deleted.",
      };
    }

    if (user.status !== "DELETION_PENDING") {
      throw new InvalidAccountStateError(
        `Account cannot be finalized: status is "${user.status}", expected "DELETION_PENDING".`,
      );
    }

    const isExpired =
      user.deletionScheduledAt &&
      user.deletionScheduledAt.getTime() <= Date.now();

    if (!isExpired && !params.force) {
      throw new InvalidAccountStateError(
        "Account deletion retention schedule has not expired yet.",
      );
    }

    // Permanently mark identity as DELETED
    await updateIdentityStatus(this.pool, params.userId, "DELETED", null);

    // Invalidate any remaining sessions with exact DELETED reason
    await revokeAllUserSessions(this.pool, params.userId, "ACCOUNT_DELETED");

    await recordSecurityEvent(this.pool, {
      eventType: "ACCOUNT_DELETED",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        finalizedAt: new Date().toISOString(),
      },
    });

    return {
      message: "Account deletion has been permanently finalized.",
    };
  }

  /**
   * Batch idempotent finalizer: finds all accounts whose deletion schedule has expired
   * and executes permanent deletion.
   */
  async finalizeExpiredAccountDeletions(): Promise<{
    finalizedCount: number;
    accountIds: string[];
  }> {
    const expiredUsers = await findExpiredDeletionPendingIdentities(this.pool);
    const accountIds: string[] = [];

    for (const u of expiredUsers) {
      await this.finalizeAccountDeletion({ userId: u.id });
      accountIds.push(u.id);
    }

    return {
      finalizedCount: accountIds.length,
      accountIds,
    };
  }
}
