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
  Listing,
  CreateListingParams,
  ListListingsParams,
  ListingStatus,
} from "../types.js";

interface ListingRow {
  id: string;
  property_id: string;
  owner_type: Listing["ownerType"];
  agency_id: string | null;
  broker_id: string | null;
  listing_intent: Listing["listingIntent"];
  title: string | null;
  description: string | null;
  price_minor: string | number | bigint;
  currency: string;
  price_period: Listing["pricePeriod"];
  security_deposit_minor: string | number | bigint | null;
  maintenance_fee_minor: string | number | bigint | null;
  is_negotiable: boolean;
  available_from: string | null;
  status: Listing["status"];
  is_verified: boolean;
  is_featured: boolean;
  created_by: string;
  updated_by: string | null;
  published_at: Date | null;
  expires_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    propertyId: row.property_id,
    ownerType: row.owner_type,
    agencyId: row.agency_id,
    brokerId: row.broker_id,
    listingIntent: row.listing_intent,
    title: row.title,
    description: row.description,
    priceMinor: BigInt(row.price_minor),
    currency: row.currency,
    pricePeriod: row.price_period,
    securityDepositMinor: row.security_deposit_minor !== null ? BigInt(row.security_deposit_minor) : null,
    maintenanceFeeMinor: row.maintenance_fee_minor !== null ? BigInt(row.maintenance_fee_minor) : null,
    isNegotiable: row.is_negotiable,
    availableFrom: row.available_from,
    status: row.status,
    isVerified: row.is_verified,
    isFeatured: row.is_featured,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LISTING_SELECT_FIELDS = `
  id, property_id, owner_type, agency_id, broker_id, listing_intent,
  title, description, price_minor, currency, price_period, security_deposit_minor,
  maintenance_fee_minor, is_negotiable, available_from, status, is_verified,
  is_featured, created_by, updated_by, published_at, expires_at,
  archived_at, created_at, updated_at
`;

export class ListingRepository {
  constructor(private readonly pool: Pool) {}

  async createListing(
    params: CreateListingParams,
    executor?: QueryExecutor,
  ): Promise<Listing> {
    const exec = executor ?? this.pool;

    const result = await executeQuery<ListingRow>(
      exec,
      `INSERT INTO listings (
         property_id,
         owner_type,
         agency_id,
         broker_id,
         listing_intent,
         title,
         description,
         price_minor,
         currency,
         price_period,
         security_deposit_minor,
         maintenance_fee_minor,
         is_negotiable,
         available_from,
         status,
         created_by
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
       )
       RETURNING ${LISTING_SELECT_FIELDS};`,
      [
        params.propertyId,
        params.ownerType,
        params.agencyId ?? null,
        params.brokerId ?? null,
        params.listingIntent,
        params.title ?? null,
        params.description ?? null,
        params.priceMinor.toString(),
        params.currency ?? "INR",
        params.pricePeriod ?? null,
        params.securityDepositMinor !== undefined && params.securityDepositMinor !== null
          ? params.securityDepositMinor.toString()
          : null,
        params.maintenanceFeeMinor !== undefined && params.maintenanceFeeMinor !== null
          ? params.maintenanceFeeMinor.toString()
          : null,
        params.isNegotiable ?? false,
        params.availableFrom ?? null,
        params.status ?? "DRAFT",
        params.createdBy,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to insert listing record.");
    }
    return mapListingRow(row);
  }

  async findById(
    id: string,
    executor?: QueryExecutor,
  ): Promise<Listing | null> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<ListingRow>(
      exec,
      `SELECT ${LISTING_SELECT_FIELDS}
       FROM listings
       WHERE id = $1;`,
      [id],
    );

    const row = result.rows[0];
    return row ? mapListingRow(row) : null;
  }

  async findByPropertyId(
    propertyId: string,
    executor?: QueryExecutor,
  ): Promise<Listing[]> {
    const exec = executor ?? this.pool;
    const result = await executeQuery<ListingRow>(
      exec,
      `SELECT ${LISTING_SELECT_FIELDS}
       FROM listings
       WHERE property_id = $1
       ORDER BY created_at DESC, id DESC;`,
      [propertyId],
    );

    return result.rows.map(mapListingRow);
  }

  async listListings(
    params: ListListingsParams,
    executor?: QueryExecutor,
  ): Promise<PaginatedResponse<Listing>> {
    const exec = executor ?? this.pool;
    const limit = normalizeLimit(params.limit);

    const paginationConfig = {
      sortField: "createdAt" as const,
      direction: "DESC" as const,
      tieBreakerField: "id" as const,
      queryContext: "listings_list",
    };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.propertyId) {
      conditions.push(`property_id = $${paramIndex++}`);
      values.push(params.propertyId);
    }

    if (params.agencyId) {
      conditions.push(`agency_id = $${paramIndex++}`);
      values.push(params.agencyId);
    }

    if (params.brokerId) {
      conditions.push(`broker_id = $${paramIndex++}`);
      values.push(params.brokerId);
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.listingIntent) {
      conditions.push(`listing_intent = $${paramIndex++}`);
      values.push(params.listingIntent);
    }

    if (params.search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${params.search}%`);
      paramIndex++;
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
      SELECT ${LISTING_SELECT_FIELDS}
      FROM listings
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex};
    `;
    values.push(limit + 1);

    const result = await executeQuery<ListingRow>(exec, query, values);
    const listings = result.rows.map(mapListingRow);

    return buildPaginatedResult(listings, limit, paginationConfig);
  }

  async updateStatus(
    id: string,
    newStatus: ListingStatus,
    expectedCurrentStatuses?: ListingStatus[],
    executor?: QueryExecutor,
  ): Promise<Listing | null> {
    const exec = executor ?? this.pool;
    const conditions: string[] = ["id = $1"];
    const values: unknown[] = [id, newStatus];
    let paramIndex = 3;

    if (expectedCurrentStatuses && expectedCurrentStatuses.length > 0) {
      conditions.push(`status = ANY($${paramIndex++}::varchar[])`);
      values.push(expectedCurrentStatuses);
    }

    const result = await executeQuery<ListingRow>(
      exec,
      `UPDATE listings
       SET status = $2::varchar,
           published_at = CASE WHEN $2::varchar = 'PUBLISHED' AND published_at IS NULL THEN NOW() ELSE published_at END,
           archived_at = CASE WHEN $2::varchar = 'ARCHIVED' AND archived_at IS NULL THEN NOW() ELSE archived_at END,
           updated_at = NOW()
       WHERE ${conditions.join(" AND ")}
       RETURNING ${LISTING_SELECT_FIELDS};`,
      values,
    );

    const row = result.rows[0];
    return row ? mapListingRow(row) : null;
  }
}
