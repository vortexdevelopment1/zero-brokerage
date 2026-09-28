import type { ApiErrorDetail, ApiErrorEnvelope } from "./types";

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "ABORTED"
  | "INVALID_RESPONSE"
  | "HTTP_ERROR"
  | "UNKNOWN_ERROR"
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_SERVER_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly status?: number;
  readonly details?: unknown;
  readonly errorDetails?: ApiErrorDetail[];

  constructor(
    code: ApiErrorCode | string,
    message: string,
    options?: {
      status?: number;
      details?: unknown;
      errorDetails?: ApiErrorDetail[];
      cause?: unknown;
    },
  ) {
    super(message, {
      cause: options?.cause,
    });

    this.name = "ApiError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
    this.errorDetails = options?.errorDetails;
  }
}

/**
 * Maps any error or backend API error into a privacy-preserving, user-friendly message.
 * Never exposes stack traces, SQL errors, or account-enumeration information.
 */
export function mapApiErrorToUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return "Unable to connect to the server. Please check your internet connection.";
    }
    if (error.code === "TIMEOUT") {
      return "The connection timed out. Please try again.";
    }
    if (error.code === "RATE_LIMITED" || error.status === 429) {
      return "Too many attempts. Please wait a few moments before trying again.";
    }
    if (error.code === "UNAUTHORIZED" || error.status === 401) {
      return "Invalid verification code. Please check and try again.";
    }
    if (
      error.code === "VALIDATION_FAILED" ||
      error.status === 422 ||
      error.status === 400
    ) {
      if (error.errorDetails && error.errorDetails.length > 0) {
        return error.errorDetails[0].message;
      }
      return error.message || "Invalid input. Please check your information.";
    }
    if (error.code === "NOT_FOUND" || error.status === 404) {
      return "The requested verification challenge could not be found or has expired.";
    }
    if (
      error.code === "INTERNAL_SERVER_ERROR" ||
      (error.status && error.status >= 500)
    ) {
      return "Our service is temporarily unavailable. Please try again shortly.";
    }
    if (
      error.message &&
      !error.message.includes("fetch") &&
      !error.message.includes("Object")
    ) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    if (
      error.message.includes("Network request failed") ||
      error.message.includes("Failed to fetch")
    ) {
      return "Network connection issue. Please check your internet connection.";
    }
  }

  return "Something went wrong. Please try again.";
}

/**
 * Extracts structured API error details from an unknown response payload.
 */
export function parseApiErrorEnvelope(
  status: number,
  payload: unknown,
): { code: string; message: string; details?: ApiErrorDetail[] } {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const errorObj = (payload as ApiErrorEnvelope).error;
    return {
      code: typeof errorObj.code === "string" ? errorObj.code : "HTTP_ERROR",
      message:
        typeof errorObj.message === "string"
          ? errorObj.message
          : "The request failed.",
      details: Array.isArray(errorObj.details) ? errorObj.details : undefined,
    };
  }

  return {
    code:
      status === 429
        ? "RATE_LIMITED"
        : status === 401
          ? "UNAUTHORIZED"
          : "HTTP_ERROR",
    message: status === 429 ? "Too many requests" : "The request failed.",
  };
}
