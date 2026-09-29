import { BadRequestError } from "../errors/index.js";

/**
 * Conservative technical defaults for cursor pagination.
 * These are engineering baselines and can be overridden by specific domain endpoints.
 */
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const MIN_PAGE_LIMIT = 1;
export const CURSOR_VERSION = 1;
const MAX_RAW_CURSOR_LENGTH = 1024;

export type SortDirection = "ASC" | "DESC";

export interface PaginationMetadata {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface CursorPayload {
  v: 1;
  sortField: string;
  sortValue: string | number;
  direction: SortDirection;
  tieBreakerField: string;
  tieBreakerValue: string;
  queryContext?: string | undefined;
}

export interface KeysetPaginationConfig<T = object> {
  sortField: string;
  direction: SortDirection;
  tieBreakerField?: string | undefined; // defaults to "id"
  allowedSortFields?: string[] | undefined;
  queryContext?: string | undefined;
  defaultLimit?: number | undefined;
  maxLimit?: number | undefined;
}

/**
 * Normalizes and bounds the requested pagination limit.
 */
export function normalizeLimit(
  rawLimit?: unknown,
  options?: { defaultLimit?: number; maxLimit?: number },
): number {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_PAGE_LIMIT;
  const maxLimit = options?.maxLimit ?? MAX_PAGE_LIMIT;

  if (rawLimit === undefined || rawLimit === null || rawLimit === "") {
    return defaultLimit;
  }

  const parsed =
    typeof rawLimit === "number" ? rawLimit : parseInt(String(rawLimit), 10);

  if (Number.isNaN(parsed) || parsed < MIN_PAGE_LIMIT) {
    return defaultLimit;
  }

  return Math.min(parsed, maxLimit);
}

/**
 * Encodes cursor payload into an opaque Base64URL string.
 */
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf-8").toString("base64url");
}

/**
 * Decodes and rigorously validates an opaque pagination cursor.
 * Ensures version match, context binding, and prevents query parameter tampering.
 */
export function decodeCursor(
  cursor: string,
  expectedConfig: {
    sortField: string;
    direction: SortDirection;
    tieBreakerField?: string | undefined;
    queryContext?: string | undefined;
    allowedSortFields?: string[] | undefined;
  },
): CursorPayload {
  if (typeof cursor !== "string" || !cursor.trim()) {
    throw new BadRequestError("Invalid cursor parameter.");
  }

  if (cursor.length > MAX_RAW_CURSOR_LENGTH) {
    throw new BadRequestError("Cursor exceeds maximum permitted length.");
  }

  let parsed: unknown;
  try {
    const json = Buffer.from(cursor.trim(), "base64url").toString("utf-8");
    parsed = JSON.parse(json);
  } catch {
    throw new BadRequestError("Malformed or corrupted pagination cursor.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new BadRequestError("Invalid cursor structure.");
  }

  const p = parsed as Partial<CursorPayload>;

  if (p.v !== CURSOR_VERSION) {
    throw new BadRequestError(
      `Unsupported cursor version: ${String(p.v)}. Expected version ${CURSOR_VERSION}.`,
    );
  }

  if (
    typeof p.sortField !== "string" ||
    typeof p.tieBreakerField !== "string" ||
    (p.direction !== "ASC" && p.direction !== "DESC")
  ) {
    throw new BadRequestError("Invalid cursor fields.");
  }

  // Allowlist validation for sort field
  if (
    expectedConfig.allowedSortFields &&
    !expectedConfig.allowedSortFields.includes(p.sortField)
  ) {
    throw new BadRequestError(`Sort field "${p.sortField}" is not permitted.`);
  }

  // Validate sort field matches current endpoint configuration
  if (p.sortField !== expectedConfig.sortField) {
    throw new BadRequestError(
      `Cursor sort field mismatch. Expected "${expectedConfig.sortField}", received "${p.sortField}".`,
    );
  }

  // Validate sort direction matches current endpoint configuration
  if (p.direction !== expectedConfig.direction) {
    throw new BadRequestError(
      `Cursor direction mismatch. Expected "${expectedConfig.direction}", received "${p.direction}".`,
    );
  }

  // Validate tie-breaker field matches
  const expectedTieBreaker = expectedConfig.tieBreakerField ?? "id";
  if (p.tieBreakerField !== expectedTieBreaker) {
    throw new BadRequestError(
      `Cursor tie-breaker mismatch. Expected "${expectedTieBreaker}", received "${p.tieBreakerField}".`,
    );
  }

  // Validate query context binding
  if (expectedConfig.queryContext) {
    if (p.queryContext !== expectedConfig.queryContext) {
      throw new BadRequestError(
        "Cursor was generated for a different query context and cannot be reused here.",
      );
    }
  }

  if (
    p.sortValue === undefined ||
    p.sortValue === null ||
    typeof p.tieBreakerValue !== "string" ||
    !p.tieBreakerValue
  ) {
    throw new BadRequestError("Missing required cursor comparison values.");
  }

  return {
    v: 1,
    sortField: p.sortField,
    sortValue: p.sortValue,
    direction: p.direction,
    tieBreakerField: p.tieBreakerField,
    tieBreakerValue: p.tieBreakerValue,
    queryContext: p.queryContext,
  };
}

export interface KeysetConditionResult {
  clause: string;
  values: [sortValue: string | number, tieBreakerValue: string];
}

/**
 * Builds the parameterized SQL WHERE condition for keyset comparison.
 * Strictly uses allowlisted column names to prevent SQL injection.
 * Does NOT use OFFSET.
 */
export function buildKeysetCondition(params: {
  sortColumn: string;
  tieBreakerColumn: string;
  sortValue: string | number;
  tieBreakerValue: string;
  direction: SortDirection;
  startIndex?: number | undefined; // 1-based parameter index (e.g. $1, $2)
}): KeysetConditionResult {
  const { sortColumn, tieBreakerColumn, sortValue, tieBreakerValue, direction } =
    params;

  // Strict identifier validation
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortColumn)) {
    throw new Error(`Invalid sort column identifier: "${sortColumn}"`);
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tieBreakerColumn)) {
    throw new Error(
      `Invalid tie-breaker column identifier: "${tieBreakerColumn}"`,
    );
  }

  const idx1 = params.startIndex ?? 1;
  const idx2 = idx1 + 1;

  const operator = direction === "ASC" ? ">" : "<";

  // Keyset forward logic:
  // ASC: (col > $1 OR (col = $1 AND tie_breaker > $2))
  // DESC: (col < $1 OR (col = $1 AND tie_breaker < $2))
  const clause = `(${sortColumn} ${operator} $${idx1} OR (${sortColumn} = $${idx1} AND ${tieBreakerColumn} ${operator} $${idx2}))`;

  return {
    clause,
    values: [sortValue, tieBreakerValue],
  };
}

/**
 * Assembles a PaginatedResponse from query results fetched with (limit + 1).
 * If items.length > limit, sets hasNextPage: true, generates opaque nextCursor,
 * and trims the returned data to exact limit.
 */
export function buildPaginatedResult<T extends object>(
  items: T[],
  limit: number,
  config: KeysetPaginationConfig<T>,
): PaginatedResponse<T> {
  const tieBreakerField = (config.tieBreakerField ?? "id") as keyof T;
  const sortField = config.sortField as keyof T;
  const hasNextPage = items.length > limit;

  const data = hasNextPage ? items.slice(0, limit) : items;

  let nextCursor: string | null = null;

  if (hasNextPage && data.length > 0) {
    const lastItem = data[data.length - 1];
    if (lastItem) {
      const rawSortVal = (lastItem as Record<string, unknown>)[sortField as string];
      const rawTieVal = (lastItem as Record<string, unknown>)[tieBreakerField as string];

      const sortValue =
        rawSortVal instanceof Date
          ? rawSortVal.toISOString()
          : (rawSortVal as string | number);

      const tieBreakerValue = String(rawTieVal);

      nextCursor = encodeCursor({
        v: 1,
        sortField: config.sortField,
        sortValue,
        direction: config.direction,
        tieBreakerField: String(tieBreakerField),
        tieBreakerValue,
        queryContext: config.queryContext,
      });
    }
  }

  return {
    data,
    pagination: {
      hasNextPage,
      nextCursor,
    },
  };
}
