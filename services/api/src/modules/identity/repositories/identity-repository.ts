import { executeQuery, type QueryExecutor } from "@zero-brokerage/database";
import {
  buildKeysetCondition,
  buildPaginatedResult,
  decodeCursor,
  normalizeLimit,
  type PaginatedResponse,
} from "../../../common/pagination/index.js";
import type {
  AgencyMembership,
  AuthIdentity,
  BrokerVerification,
  BrokerVerificationStatus,
  PlatformRole,
  UserProfile,
  UserStatus,
  AdminUserListItem,
  AdminBrokerListItem,
} from "../types.js";

type DBExecutor = QueryExecutor;

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

export async function listUsers(
  executor: DBExecutor,
  params: {
    limit?: number | undefined;
    cursor?: string | null | undefined;
    status?: UserStatus | undefined;
    role?: PlatformRole | undefined;
    search?: string | undefined;
  },
): Promise<PaginatedResponse<AdminUserListItem>> {
  const limit = normalizeLimit(params.limit);

  const paginationConfig = {
    sortField: "createdAt" as const,
    direction: "DESC" as const,
    tieBreakerField: "id" as const,
    queryContext: "admin_users_list",
  };

  const conditions: string[] = ["i.status != 'DELETED'"];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.status) {
    conditions.push(`i.status = $${paramIndex++}`);
    values.push(params.status);
  }

  if (params.role) {
    conditions.push(`i.role = $${paramIndex++}`);
    values.push(params.role);
  }

  if (params.search) {
    conditions.push(`(i.phone ILIKE $${paramIndex} OR p.full_name ILIKE $${paramIndex} OR p.email ILIKE $${paramIndex})`);
    values.push(`%${params.search}%`);
    paramIndex++;
  }

  if (params.cursor) {
    const decoded = decodeCursor(params.cursor, paginationConfig);
    const keyset = buildKeysetCondition({
      sortColumn: "i.created_at",
      tieBreakerColumn: "i.id",
      sortValue: decoded.sortValue,
      tieBreakerValue: decoded.tieBreakerValue,
      direction: decoded.direction,
      startIndex: paramIndex,
    });
    conditions.push(keyset.clause);
    values.push(...keyset.values);
    paramIndex += 2;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const query = `
    SELECT
      i.id, i.phone, i.role, i.status, i.created_at, i.updated_at,
      p.full_name, p.email, p.avatar_url
    FROM auth_identities i
    LEFT JOIN user_profiles p ON p.user_id = i.id
    ${whereClause}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT $${paramIndex};
  `;
  values.push(limit + 1);

  interface UserListRow {
    id: string;
    phone: string;
    role: PlatformRole;
    status: UserStatus;
    created_at: Date;
    updated_at: Date;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }

  const result = await executeQuery<UserListRow>(executor, query, values);
  const items: AdminUserListItem[] = result.rows.map((row) => ({
    id: row.id,
    phone: row.phone,
    role: row.role,
    status: row.status,
    fullName: row.full_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return buildPaginatedResult(items, limit, paginationConfig);
}

export async function listBrokers(
  executor: DBExecutor,
  params: {
    limit?: number | undefined;
    cursor?: string | null | undefined;
    verificationStatus?: BrokerVerificationStatus | undefined;
    search?: string | undefined;
  },
): Promise<PaginatedResponse<AdminBrokerListItem>> {
  const limit = normalizeLimit(params.limit);

  const paginationConfig = {
    sortField: "createdAt" as const,
    direction: "DESC" as const,
    tieBreakerField: "id" as const,
    queryContext: "admin_brokers_list",
  };

  const conditions: string[] = [
    "i.status != 'DELETED'",
    "i.role IN ('INDEPENDENT_BROKER', 'AGENCY_BROKER')",
  ];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.verificationStatus) {
    conditions.push(`COALESCE(bv.status, 'UNSUBMITTED') = $${paramIndex++}`);
    values.push(params.verificationStatus);
  }

  if (params.search) {
    conditions.push(`(i.phone ILIKE $${paramIndex} OR p.full_name ILIKE $${paramIndex} OR p.email ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex})`);
    values.push(`%${params.search}%`);
    paramIndex++;
  }

  if (params.cursor) {
    const decoded = decodeCursor(params.cursor, paginationConfig);
    const keyset = buildKeysetCondition({
      sortColumn: "i.created_at",
      tieBreakerColumn: "i.id",
      sortValue: decoded.sortValue,
      tieBreakerValue: decoded.tieBreakerValue,
      direction: decoded.direction,
      startIndex: paramIndex,
    });
    conditions.push(keyset.clause);
    values.push(...keyset.values);
    paramIndex += 2;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const query = `
    SELECT
      i.id, i.phone, i.role, i.status, i.created_at, i.updated_at,
      p.full_name, p.email, p.avatar_url,
      a.name AS agency_name,
      COALESCE(bv.status, 'UNSUBMITTED') AS verification_status,
      bv.license_number,
      COALESCE(bv.document_urls, '[]'::jsonb) AS document_urls,
      bv.rejection_reason,
      bv.reviewed_at
    FROM auth_identities i
    LEFT JOIN user_profiles p ON p.user_id = i.id
    LEFT JOIN broker_verifications bv ON bv.user_id = i.id
    LEFT JOIN agency_memberships am ON am.user_id = i.id AND am.status = 'ACTIVE'
    LEFT JOIN agencies a ON a.id = am.agency_id
    ${whereClause}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT $${paramIndex};
  `;
  values.push(limit + 1);

  interface BrokerListRow {
    id: string;
    phone: string;
    role: PlatformRole;
    status: UserStatus;
    created_at: Date;
    updated_at: Date;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    agency_name: string | null;
    verification_status: BrokerVerificationStatus;
    license_number: string | null;
    document_urls: string[];
    rejection_reason: string | null;
    reviewed_at: Date | null;
  }

  const result = await executeQuery<BrokerListRow>(executor, query, values);
  const items: AdminBrokerListItem[] = result.rows.map((row) => ({
    id: row.id,
    phone: row.phone,
    role: row.role,
    status: row.status,
    fullName: row.full_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    agencyName: row.agency_name,
    verificationStatus: row.verification_status,
    licenseNumber: row.license_number,
    documentUrls: Array.isArray(row.document_urls) ? row.document_urls : [],
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return buildPaginatedResult(items, limit, paginationConfig);
}

export async function updateBrokerVerification(
  executor: DBExecutor,
  params: {
    userId: string;
    status: BrokerVerificationStatus;
    rejectionReason?: string | null | undefined;
    reviewedBy?: string | null | undefined;
  },
): Promise<BrokerVerification> {
  const result = await executeQuery<BrokerVerificationRow>(
    executor,
    `INSERT INTO broker_verifications (user_id, status, rejection_reason, reviewed_by, reviewed_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET status = $2,
         rejection_reason = $3,
         reviewed_by = $4,
         reviewed_at = NOW(),
         updated_at = NOW()
     RETURNING *;`,
    [
      params.userId,
      params.status,
      params.rejectionReason ?? null,
      params.reviewedBy ?? null,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to update broker verification.");
  }

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
