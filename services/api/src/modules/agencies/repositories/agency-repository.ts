import type { Pool } from "pg";
import { executeQuery, type QueryExecutor } from "@zero-brokerage/database";
import {
  buildKeysetCondition,
  buildPaginatedResult,
  decodeCursor,
  normalizeLimit,
  type PaginatedResponse,
} from "../../../common/pagination/index.js";
import type {
  Agency,
  AgencyMember,
  AddAgencyMemberParams,
  CreateAgencyParams,
  ListAgenciesParams,
} from "../types.js";

interface AgencyRow {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  license_number: string | null;
  status: Agency["status"];
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface AgencyMemberRow {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyMember["role"];
  status: AgencyMember["status"];
  created_at: Date;
  updated_at: Date;
}

function mapAgencyRow(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    legalName: row.legal_name,
    licenseNumber: row.license_number,
    status: row.status,
    email: row.email,
    phone: row.phone,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapAgencyMemberRow(row: AgencyMemberRow): AgencyMember {
  return {
    id: row.id,
    agencyId: row.agency_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AgencyRepository {
  constructor(private readonly pool: Pool) {}

  async createAgency(
    params: CreateAgencyParams,
    executor?: QueryExecutor,
  ): Promise<Agency> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<AgencyRow>(
      exec,
      `INSERT INTO agencies (
         name,
         slug,
         legal_name,
         license_number,
         status,
         email,
         phone,
         address_line_1,
         address_line_2,
         city,
         state,
         postal_code,
         country_code
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING
         id, name, slug, legal_name, license_number, status,
         email, phone, address_line_1, address_line_2, city,
         state, postal_code, country_code, created_at, updated_at, deleted_at;`,
      [
        params.name,
        params.slug,
        params.legalName ?? null,
        params.licenseNumber ?? null,
        params.status ?? "ACTIVE",
        params.email ?? null,
        params.phone ?? null,
        params.addressLine1 ?? null,
        params.addressLine2 ?? null,
        params.city ?? null,
        params.state ?? null,
        params.postalCode ?? null,
        params.countryCode ?? "IN",
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to insert agency record.");
    }
    return mapAgencyRow(row);
  }

  async findById(
    id: string,
    executor?: QueryExecutor,
  ): Promise<Agency | null> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<AgencyRow>(
      exec,
      `SELECT
         id, name, slug, legal_name, license_number, status,
         email, phone, address_line_1, address_line_2, city,
         state, postal_code, country_code, created_at, updated_at, deleted_at
       FROM agencies
       WHERE id = $1;`,
      [id],
    );

    const row = result.rows[0];
    return row ? mapAgencyRow(row) : null;
  }

  async findBySlug(
    slug: string,
    executor?: QueryExecutor,
  ): Promise<Agency | null> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<AgencyRow>(
      exec,
      `SELECT
         id, name, slug, legal_name, license_number, status,
         email, phone, address_line_1, address_line_2, city,
         state, postal_code, country_code, created_at, updated_at, deleted_at
       FROM agencies
       WHERE slug = $1;`,
      [slug],
    );

    const row = result.rows[0];
    return row ? mapAgencyRow(row) : null;
  }

  async listAgencies(
    params: ListAgenciesParams,
    executor?: QueryExecutor,
  ): Promise<PaginatedResponse<Agency>> {
    const exec = executor ?? this.pool;
    const limit = normalizeLimit(params.limit);

    const paginationConfig = {
      sortField: "createdAt" as const,
      direction: "DESC" as const,
      tieBreakerField: "id" as const,
      queryContext: "agencies_list",
    };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.city) {
      conditions.push(`city = $${paramIndex++}`);
      values.push(params.city);
    }

    if (params.cursor) {
      const decoded = decodeCursor(params.cursor, paginationConfig);
      const keyset = buildKeysetCondition({
        sortColumn: "created_at",
        tieBreakerColumn: "id",
        sortValue: decoded.sortValue,
        tieBreakerValue: decoded.tieBreakerValue,
        direction: decoded.direction,
        startIndex: paramIndex,
      });
      conditions.push(keyset.clause);
      values.push(...keyset.values);
      paramIndex += 2;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT
        id, name, slug, legal_name, license_number, status,
        email, phone, address_line_1, address_line_2, city,
        state, postal_code, country_code, created_at, updated_at, deleted_at
      FROM agencies
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex};
    `;
    values.push(limit + 1);

    const result = await executeQuery<AgencyRow>(exec, query, values);
    const agencies = result.rows.map(mapAgencyRow);

    return buildPaginatedResult(agencies, limit, paginationConfig);
  }

  async addMember(
    params: AddAgencyMemberParams,
    executor?: QueryExecutor,
  ): Promise<AgencyMember> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<AgencyMemberRow>(
      exec,
      `INSERT INTO agency_memberships (
         agency_id,
         user_id,
         role,
         status
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id, agency_id, user_id, role, status, created_at, updated_at;`,
      [
        params.agencyId,
        params.userId,
        params.role,
        params.status ?? "ACTIVE",
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to insert agency membership record.");
    }
    return mapAgencyMemberRow(row);
  }

  async findMembers(
    agencyId: string,
    executor?: QueryExecutor,
  ): Promise<AgencyMember[]> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<AgencyMemberRow>(
      exec,
      `SELECT id, agency_id, user_id, role, status, created_at, updated_at
       FROM agency_memberships
       WHERE agency_id = $1
       ORDER BY created_at ASC;`,
      [agencyId],
    );

    return result.rows.map(mapAgencyMemberRow);
  }
}
