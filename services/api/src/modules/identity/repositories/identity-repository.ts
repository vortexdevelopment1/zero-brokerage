import type { Pool, PoolClient } from "pg";
import { executeQuery } from "@zero-brokerage/database";
import type {
  AgencyMembership,
  AuthIdentity,
  BrokerVerification,
  PlatformRole,
  UserProfile,
  UserStatus,
} from "../types.js";

type DBExecutor = Pool | PoolClient;

interface IdentityRow {
  id: string;
  phone: string;
  status: UserStatus;
  role: PlatformRole;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  deletion_scheduled_at: Date | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface AgencyMembershipRow {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyMembership["role"];
  status: AgencyMembership["status"];
  created_at: Date;
  updated_at: Date;
}

interface BrokerVerificationRow {
  id: string;
  user_id: string;
  status: BrokerVerification["status"];
  license_number: string | null;
  document_urls: string[];
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapIdentityRow(row: IdentityRow): AuthIdentity {
  return {
    id: row.id,
    phone: row.phone,
    status: row.status,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deletionScheduledAt: row.deletion_scheduled_at,
  };
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    preferences: row.preferences ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findIdentityByPhone(
  executor: DBExecutor,
  phone: string,
): Promise<AuthIdentity | null> {
  const result = await executeQuery<IdentityRow>(
    executor,
    `SELECT * FROM auth_identities WHERE phone = $1 LIMIT 1;`,
    [phone],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  return mapIdentityRow(result.rows[0]);
}

export async function findExpiredDeletionPendingIdentities(
  executor: DBExecutor,
): Promise<AuthIdentity[]> {
  const result = await executeQuery<IdentityRow>(
    executor,
    `SELECT * FROM auth_identities
     WHERE status = 'DELETION_PENDING'
       AND deletion_scheduled_at <= NOW()
     ORDER BY deletion_scheduled_at ASC;`,
  );

  return result.rows.map(mapIdentityRow);
}

export async function findIdentityById(
  executor: DBExecutor,
  id: string,
): Promise<AuthIdentity | null> {
  const result = await executeQuery<IdentityRow>(
    executor,
    `SELECT * FROM auth_identities WHERE id = $1 LIMIT 1;`,
    [id],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  return mapIdentityRow(result.rows[0]);
}

export async function createIdentity(
  executor: DBExecutor,
  data: {
    phone: string;
    role?: PlatformRole;
  },
): Promise<AuthIdentity> {
  const result = await executeQuery<IdentityRow>(
    executor,
    `INSERT INTO auth_identities (phone, role)
     VALUES ($1, $2)
     RETURNING *;`,
    [data.phone, data.role ?? "USER"],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create identity record.");
  }

  return mapIdentityRow(row);
}

export async function updateIdentityPhone(
  executor: DBExecutor,
  id: string,
  newPhone: string,
): Promise<void> {
  await executeQuery(
    executor,
    `UPDATE auth_identities
     SET phone = $1, updated_at = NOW()
     WHERE id = $2;`,
    [newPhone, id],
  );
}

export async function updateIdentityStatus(
  executor: DBExecutor,
  id: string,
  status: UserStatus,
  deletionScheduledAt?: Date | null,
): Promise<void> {
  await executeQuery(
    executor,
    `UPDATE auth_identities
     SET status = $1,
         deletion_scheduled_at = $2,
         deleted_at = CASE WHEN $1 = 'DELETED' THEN NOW() ELSE deleted_at END,
         updated_at = NOW()
     WHERE id = $3;`,
    [status, deletionScheduledAt ?? null, id],
  );
}

export async function findUserProfile(
  executor: DBExecutor,
  userId: string,
): Promise<UserProfile | null> {
  const result = await executeQuery<ProfileRow>(
    executor,
    `SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1;`,
    [userId],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  return mapProfileRow(result.rows[0]);
}

export async function createUserProfile(
  executor: DBExecutor,
  data: {
    userId: string;
    fullName?: string | null;
    email?: string | null;
  },
): Promise<UserProfile> {
  const result = await executeQuery<ProfileRow>(
    executor,
    `INSERT INTO user_profiles (user_id, full_name, email)
     VALUES ($1, $2, $3)
     RETURNING *;`,
    [data.userId, data.fullName ?? null, data.email ?? null],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create profile record.");
  }

  return mapProfileRow(row);
}

export async function anonymizeUserProfile(
  executor: DBExecutor,
  userId: string,
): Promise<void> {
  await executeQuery(
    executor,
    `UPDATE user_profiles
     SET full_name = 'Deleted User',
         email = NULL,
         avatar_url = NULL,
         preferences = '{}'::jsonb,
         updated_at = NOW()
     WHERE user_id = $1;`,
    [userId],
  );
}

export async function findAgencyMembershipsByUserId(
  executor: DBExecutor,
  userId: string,
): Promise<AgencyMembership[]> {
  const result = await executeQuery<AgencyMembershipRow>(
    executor,
    `SELECT * FROM agency_memberships
     WHERE user_id = $1 AND status != 'TERMINATED'
     ORDER BY created_at ASC;`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    agencyId: row.agency_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function findBrokerVerificationByUserId(
  executor: DBExecutor,
  userId: string,
): Promise<BrokerVerification | null> {
  const result = await executeQuery<BrokerVerificationRow>(
    executor,
    `SELECT * FROM broker_verifications
     WHERE user_id = $1 LIMIT 1;`,
    [userId],
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    licenseNumber: row.license_number,
    documentUrls: Array.isArray(row.document_urls) ? row.document_urls : [],
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
