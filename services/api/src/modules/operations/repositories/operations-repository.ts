import type { Pool } from "pg";
import { executeQuery, type QueryExecutor } from "@zero-brokerage/database";
import {
  buildKeysetCondition,
  buildPaginatedResult,
  decodeCursor,
  normalizeLimit,
  type PaginatedResponse,
} from "../../../common/pagination/index.js";
import type { Deal, Visit, Cancellation, UrgentRequirement } from "../types.js";

interface DealRow {
  id: string;
  property_id: string;
  listing_id: string | null;
  buyer_id: string;
  broker_id: string | null;
  agency_id: string | null;
  deal_value_minor: string | number | bigint;
  token_amount_minor: string | number | bigint;
  status: string;
  stage: string;
  agreement_status: string;
  review_status: string;
  user_agreement_url: string | null;
  broker_agreement_url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  buyer_name?: string | null;
  buyer_phone?: string;
  buyer_email?: string | null;
  broker_name?: string | null;
  broker_phone?: string;
  broker_license?: string | null;
  agency_name?: string | null;
  property_title?: string | null;
  property_city?: string;
  property_locality?: string;
}

function mapDealRow(row: DealRow): Deal {
  return {
    id: row.id,
    propertyId: row.property_id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    brokerId: row.broker_id,
    agencyId: row.agency_id,
    dealValueMinor: BigInt(row.deal_value_minor),
    tokenAmountMinor: BigInt(row.token_amount_minor),
    status: row.status,
    stage: row.stage,
    agreementStatus: row.agreement_status,
    reviewStatus: row.review_status,
    userAgreementUrl: row.user_agreement_url,
    brokerAgreementUrl: row.broker_agreement_url,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    buyer: row.buyer_phone
      ? {
          id: row.buyer_id,
          name: row.buyer_name ?? "Buyer",
          phone: row.buyer_phone,
          email: row.buyer_email ?? null,
        }
      : undefined,
    broker: row.broker_id && row.broker_phone
      ? {
          id: row.broker_id,
          name: row.broker_name ?? "Broker",
          phone: row.broker_phone,
          license: row.broker_license ?? null,
        }
      : null,
    agency: row.agency_id && row.agency_name
      ? {
          id: row.agency_id,
          name: row.agency_name,
        }
      : null,
    property: row.property_city
      ? {
          id: row.property_id,
          title: row.property_title ?? null,
          city: row.property_city,
          locality: row.property_locality ?? "",
        }
      : undefined,
  };
}

export class OperationsRepository {
  constructor(private readonly pool: Pool) {}

  async listDeals(
    params: {
      limit?: number | undefined;
      cursor?: string | null | undefined;
      status?: string | undefined;
      agreementStatus?: string | undefined;
      search?: string | undefined;
    },
    executor?: QueryExecutor,
  ): Promise<PaginatedResponse<Deal>> {
    const exec = executor ?? this.pool;
    const limit = normalizeLimit(params.limit);

    const paginationConfig = {
      sortField: "createdAt" as const,
      direction: "DESC" as const,
      tieBreakerField: "id" as const,
      queryContext: "deals_list",
    };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.status) {
      conditions.push(`d.status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.agreementStatus) {
      conditions.push(`d.agreement_status = $${paramIndex++}`);
      values.push(params.agreementStatus);
    }

    if (params.search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.city ILIKE $${paramIndex} OR buyer_prof.full_name ILIKE $${paramIndex} OR broker_prof.full_name ILIKE $${paramIndex})`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.cursor) {
      const decoded = decodeCursor(params.cursor, paginationConfig);
      const keyset = buildKeysetCondition({
        sortColumn: "d.created_at",
        tieBreakerColumn: "d.id",
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
        d.id, d.property_id, d.listing_id, d.buyer_id, d.broker_id, d.agency_id,
        d.deal_value_minor, d.token_amount_minor, d.status, d.stage,
        d.agreement_status, d.review_status, d.user_agreement_url, d.broker_agreement_url,
        d.notes, d.created_at, d.updated_at,
        buyer_prof.full_name AS buyer_name, buyer_id.phone AS buyer_phone, buyer_prof.email AS buyer_email,
        broker_prof.full_name AS broker_name, broker_id.phone AS broker_phone, bv.license_number AS broker_license,
        a.name AS agency_name,
        p.title AS property_title, p.city AS property_city, p.locality AS property_locality
      FROM deals d
      LEFT JOIN auth_identities buyer_id ON buyer_id.id = d.buyer_id
      LEFT JOIN user_profiles buyer_prof ON buyer_prof.user_id = d.buyer_id
      LEFT JOIN auth_identities broker_id ON broker_id.id = d.broker_id
      LEFT JOIN user_profiles broker_prof ON broker_prof.user_id = d.broker_id
      LEFT JOIN broker_verifications bv ON bv.user_id = d.broker_id
      LEFT JOIN agencies a ON a.id = d.agency_id
      LEFT JOIN properties p ON p.id = d.property_id
      ${whereClause}
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT $${paramIndex};
    `;
    values.push(limit + 1);

    const result = await executeQuery<DealRow>(exec, query, values);
    const deals = result.rows.map(mapDealRow);

    return buildPaginatedResult(deals, limit, paginationConfig);
  }

  async findDealById(id: string, executor?: QueryExecutor): Promise<Deal | null> {
    const exec = executor ?? this.pool;
    const query = `
      SELECT
        d.id, d.property_id, d.listing_id, d.buyer_id, d.broker_id, d.agency_id,
        d.deal_value_minor, d.token_amount_minor, d.status, d.stage,
        d.agreement_status, d.review_status, d.user_agreement_url, d.broker_agreement_url,
        d.notes, d.created_at, d.updated_at,
        buyer_prof.full_name AS buyer_name, buyer_id.phone AS buyer_phone, buyer_prof.email AS buyer_email,
        broker_prof.full_name AS broker_name, broker_id.phone AS broker_phone, bv.license_number AS broker_license,
        a.name AS agency_name,
        p.title AS property_title, p.city AS property_city, p.locality AS property_locality
      FROM deals d
      LEFT JOIN auth_identities buyer_id ON buyer_id.id = d.buyer_id
      LEFT JOIN user_profiles buyer_prof ON buyer_prof.user_id = d.buyer_id
      LEFT JOIN auth_identities broker_id ON broker_id.id = d.broker_id
      LEFT JOIN user_profiles broker_prof ON broker_prof.user_id = d.broker_id
      LEFT JOIN broker_verifications bv ON bv.user_id = d.broker_id
      LEFT JOIN agencies a ON a.id = d.agency_id
      LEFT JOIN properties p ON p.id = d.property_id
      WHERE d.id = $1;
    `;
    const result = await executeQuery<DealRow>(exec, query, [id]);
    return result.rows[0] ? mapDealRow(result.rows[0]) : null;
  }

  async updateDealAgreement(
    id: string,
    reviewStatus: string,
    notes?: string,
    executor?: QueryExecutor,
  ): Promise<Deal | null> {
    const exec = executor ?? this.pool;
    await executeQuery(
      exec,
      `UPDATE deals
       SET review_status = $1,
           agreement_status = CASE WHEN $1 = 'APPROVED' THEN 'COMPLETED' ELSE agreement_status END,
           stage = CASE WHEN $1 = 'APPROVED' THEN 'AGREEMENT_COMPLETED' ELSE stage END,
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3;`,
      [reviewStatus, notes ?? null, id],
    );
    return this.findDealById(id, executor);
  }

  async updateDealStatus(
    id: string,
    status: string,
    notes?: string,
    executor?: QueryExecutor,
  ): Promise<Deal | null> {
    const exec = executor ?? this.pool;
    await executeQuery(
      exec,
      `UPDATE deals
       SET status = $1,
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3;`,
      [status, notes ?? null, id],
    );
    return this.findDealById(id, executor);
  }

  // --- Cancellations ---
  async listCancellations(
    params: { limit?: number; cursor?: string; status?: string; search?: string },
    executor?: QueryExecutor,
  ): Promise<PaginatedResponse<Cancellation>> {
    const exec = executor ?? this.pool;
    const limit = normalizeLimit(params.limit);

    const paginationConfig = {
      sortField: "createdAt" as const,
      direction: "DESC" as const,
      tieBreakerField: "id" as const,
      queryContext: "cancellations_list",
    };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.search) {
      conditions.push(`(reason ILIKE $${paramIndex})`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT id, deal_id, initiated_by_id, reason, fee_amount_minor, penalty_amount_minor,
             status, refund_status, audit_trail, created_at, updated_at
      FROM cancellations
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex};
    `;
    values.push(limit + 1);

    const result = await executeQuery<any>(exec, query, values);
    const cancellations = result.rows.map((row: any) => ({
      id: row.id,
      dealId: row.deal_id,
      initiatedById: row.initiated_by_id,
      reason: row.reason,
      feeAmountMinor: BigInt(row.fee_amount_minor),
      penaltyAmountMinor: BigInt(row.penalty_amount_minor),
      status: row.status,
      refundStatus: row.refund_status,
      auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return buildPaginatedResult(cancellations, limit, paginationConfig);
  }

  async updateCancellationStatus(
    id: string,
    status: string,
    notes?: string,
    executor?: QueryExecutor,
  ): Promise<any> {
    const exec = executor ?? this.pool;
    const auditEntry = {
      timestamp: new Date().toISOString(),
      actor: "Super Admin",
      action: `Status updated to ${status}`,
      notes: notes ?? null,
    };

    const result = await executeQuery(
      exec,
      `UPDATE cancellations
       SET status = $1,
           audit_trail = audit_trail || $2::jsonb,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *;`,
      [status, JSON.stringify([auditEntry]), id],
    );
    return result.rows[0];
  }

  // --- Visits ---
  async listVisits(
    params: { limit?: number; cursor?: string; status?: string },
    executor?: QueryExecutor,
  ): Promise<PaginatedResponse<Visit>> {
    const exec = executor ?? this.pool;
    const limit = normalizeLimit(params.limit);

    const paginationConfig = {
      sortField: "createdAt" as const,
      direction: "DESC" as const,
      tieBreakerField: "id" as const,
      queryContext: "visits_list",
    };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.status) {
      conditions.push(`v.status = $${paramIndex++}`);
      values.push(params.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT v.id, v.property_id, v.visitor_id, v.broker_id, v.agency_id,
             v.scheduled_at, v.status, v.notes, v.created_at, v.updated_at,
             p.title AS property_title, p.city AS property_city,
             prof.full_name AS visitor_name, ident.phone AS visitor_phone
      FROM visits v
      LEFT JOIN properties p ON p.id = v.property_id
      LEFT JOIN auth_identities ident ON ident.id = v.visitor_id
      LEFT JOIN user_profiles prof ON prof.user_id = v.visitor_id
      ${whereClause}
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT $${paramIndex};
    `;
    values.push(limit + 1);

    const result = await executeQuery<any>(exec, query, values);
    const visits = result.rows.map((row: any) => ({
      id: row.id,
      propertyId: row.property_id,
      visitorId: row.visitor_id,
      brokerId: row.broker_id,
      agencyId: row.agency_id,
      scheduledAt: row.scheduled_at,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      property: {
        id: row.property_id,
        title: row.property_title,
        city: row.property_city,
      },
      visitor: {
        id: row.visitor_id,
        phone: row.visitor_phone,
        name: row.visitor_name,
      },
    }));

    return buildPaginatedResult(visits, limit, paginationConfig);
  }

  async updateVisitStatus(id: string, status: string, executor?: QueryExecutor): Promise<any> {
    const exec = executor ?? this.pool;
    const result = await executeQuery(
      exec,
      `UPDATE visits SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [status, id],
    );
    return result.rows[0];
  }

  // --- Urgent Requirements ---
  async listUrgentRequirements(
    params: { limit?: number; cursor?: string; status?: string },
    executor?: QueryExecutor,
  ): Promise<PaginatedResponse<UrgentRequirement>> {
    const exec = executor ?? this.pool;
    const limit = normalizeLimit(params.limit);

    const paginationConfig = {
      sortField: "createdAt" as const,
      direction: "DESC" as const,
      tieBreakerField: "id" as const,
      queryContext: "urgent_requirements_list",
    };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT id, user_id, property_type, budget_max_minor, city, status, notes, created_at, updated_at
      FROM urgent_requirements
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex};
    `;
    values.push(limit + 1);

    const result = await executeQuery<any>(exec, query, values);
    const requirements = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      propertyType: row.property_type,
      budgetMaxMinor: BigInt(row.budget_max_minor),
      city: row.city,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return buildPaginatedResult(requirements, limit, paginationConfig);
  }

  async updateUrgentRequirementStatus(id: string, status: string, executor?: QueryExecutor): Promise<any> {
    const exec = executor ?? this.pool;
    const result = await executeQuery(
      exec,
      `UPDATE urgent_requirements SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [status, id],
    );
    return result.rows[0];
  }
}
