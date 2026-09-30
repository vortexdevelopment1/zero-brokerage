import { randomUUID } from "node:crypto";

export const API_VERSION_PREFIX = "/api/v1";
export const REQUEST_ID_HEADER = "x-request-id";

/** UUID request identifiers are safe to return, log, and propagate. */
export const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Stable public error codes use upper snake case, for example VALIDATION_FAILED. */
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

export type RequestId = string;
export type ApiErrorCode = string;

export interface PaginationMeta {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ResponseMeta {
  requestId: RequestId;
}

export interface CollectionResponseMeta extends ResponseMeta {
  pagination: PaginationMeta;
}

export interface SuccessResponse<T> {
  data: T;
  meta: ResponseMeta;
}

export interface CollectionResponse<T> {
  data: T[];
  meta: CollectionResponseMeta;
}

export interface ValidationFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ErrorDetails {
  fields?: ValidationFieldError[];
}

export interface ErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ErrorDetails;
    requestId: RequestId;
    retryable?: boolean;
  };
}

export function isRequestId(value: unknown): value is RequestId {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function createRequestId(inboundRequestId?: unknown): RequestId {
  return isRequestId(inboundRequestId)
    ? inboundRequestId.toLowerCase()
    : randomUUID();
}

export function isStableErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && ERROR_CODE_PATTERN.test(value);
}

/** Canonical constructor for all new externally consumed API success responses. */
export function createCanonicalSuccessResponse<T>(
  data: T,
  requestId: RequestId,
): SuccessResponse<T> {
  return { data, meta: { requestId } };
}

/** Canonical constructor for all new externally consumed API collection responses. */
export function createCanonicalCollectionResponse<T>(
  data: T[],
  requestId: RequestId,
  pagination: PaginationMeta,
): CollectionResponse<T> {
  return { data, meta: { requestId, pagination } };
}

/** Canonical constructor for all new externally consumed API error responses. */
export function createCanonicalErrorResponse(input: {
  code: ApiErrorCode;
  message: string;
  requestId: RequestId;
  details?: ErrorDetails;
  retryable?: boolean;
}): ErrorResponse {
  if (!isStableErrorCode(input.code)) {
    throw new TypeError("API error codes must use upper snake case.");
  }

  return {
    error: {
      code: input.code,
      message: input.message,
      ...(input.details ? { details: input.details } : {}),
      requestId: input.requestId,
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    },
  };
}

export * from "./compatibility.js";
