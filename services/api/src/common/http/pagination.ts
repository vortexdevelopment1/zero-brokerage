import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_LIMIT,
  type PaginatedResponse,
  type KeysetPaginationConfig,
  type SortDirection,
  decodeCursor as internalDecodeCursor,
  encodeCursor,
  normalizeLimit,
} from "../pagination/index.js";
import {
  createCanonicalCollectionResponse,
  type CollectionResponse,
  type PaginationMeta,
  type RequestId,
} from "./contracts.js";
import { InvalidCursorError } from "../errors/index.js";

export {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_LIMIT,
  encodeCursor,
  normalizeLimit,
  type SortDirection,
};

/**
 * Standard JSON Schema fragment for collection query parameters.
 */
export const paginationQuerySchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    limit: {
      type: "integer",
      minimum: MIN_PAGE_LIMIT,
      maximum: MAX_PAGE_LIMIT,
      default: DEFAULT_PAGE_LIMIT,
    },
    cursor: {
      type: "string",
      maxLength: 1024,
    },
  },
} as const;

/**
 * Adapts internal Step 03 / pagination PaginatedResponse into canonical Step 05 CollectionResponse.
 * Maps Step 03 `hasNextPage` -> Step 05 `meta.pagination.hasMore`.
 */
export function adaptPaginationToCanonical<T>(
  internalResult: PaginatedResponse<T>,
  requestId: RequestId,
): CollectionResponse<T> {
  const pagination: PaginationMeta = {
    hasMore: internalResult.pagination.hasNextPage,
    nextCursor: internalResult.pagination.nextCursor,
  };

  return createCanonicalCollectionResponse(
    internalResult.data,
    requestId,
    pagination,
  );
}

/**
 * Safe HTTP wrapper around decodeCursor that translates raw cursor issues into canonical InvalidCursorError (422).
 */
export function decodeHttpCursor(
  cursor: string,
  config: {
    sortField: string;
    direction: SortDirection;
    tieBreakerField?: string;
    queryContext?: string;
    allowedSortFields?: string[];
  },
) {
  try {
    return internalDecodeCursor(cursor, config);
  } catch (err) {
    if (err instanceof Error) {
      throw new InvalidCursorError(err.message);
    }
    throw new InvalidCursorError("Invalid cursor parameter.");
  }
}
