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
    if (
      error.code === "PAYMENT_STATUS_UNCERTAIN" ||
      error.code === "RECONCILIATION_PENDING" ||
      error.code === "TRANSACTION_IN_FLIGHT" ||
      error.code === "PURCHASE_ALREADY_IN_PROGRESS"
    ) {
      return "Payment verification is in progress. Please check your payment history before attempting another payment.";
    }
    if (error.code === "CONTRACT_PENDING") {
      return "This financial capability is undergoing backend activation.";
    }
    if (error.code === "ENTITLEMENT_MISSING") {
      return "You have reached your membership quota or need an upgraded plan for this feature.";
    }
    if (error.code === "PLAN_UNAVAILABLE" || error.code === "PLAN_NOT_FOUND") {
      return "The requested subscription plan is currently unavailable.";
    }
    if (error.code === "ACCOUNT_INELIGIBLE") {
      return "Your account is not eligible for this membership tier.";
    }
    if (error.code === "PAYMENT_FAILED") {
      return "The payment could not be completed. No funds were captured for this subscription.";
    }
    if (error.code === "INVOICE_UNAVAILABLE" || error.code === "INVOICE_NOT_FOUND") {
      return "Tax invoice is not yet available for download.";
    }
    if (error.code === "VISIT_CONFLICT") {
      return "You already have an active visit request for this property.";
    }
    if (error.code === "DUPLICATE_ACTIVE_INQUIRY") {
      return "You already have an active inquiry for this property.";
    }
    if (error.code === "SLOT_EXPIRED") {
      return "The selected timeslot has expired. Please choose a fresh timeslot.";
    }
    if (error.code === "SLOT_UNAVAILABLE" || error.code === "SLOT_TAKEN") {
      return "The selected timeslot is no longer available. Please select another slot.";
    }
    if (error.code === "LISTING_UNAVAILABLE") {
      return "This property is currently not available for visits or inquiries.";
    }
    if (error.code === "VISIT_STATE_TRANSITION_INVALID") {
      return error.message || "This visit cannot currently be modified.";
    }
    if (error.code === "VISIT_TIME_INVALID") {
      return error.message || "The selected visit time is invalid.";
    }
    if (error.code === "FORBIDDEN" || error.status === 403) {
      return "You do not have permission to access or modify this resource.";
    }
    if (
      error.code === "SESSION_EXPIRED" ||
      (error.code === "UNAUTHORIZED" && error.message?.includes("expired"))
    ) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.code === "UNAUTHORIZED" || error.status === 401) {
      if (
        !error.message ||
        error.message.toLowerCase().includes("code") ||
        error.message.toLowerCase().includes("verification")
      ) {
        return "Invalid verification code. Please check and try again.";
      }
      return "Please sign in to continue.";
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
    if (
      error.code === "NOT_FOUND" ||
      error.code === "VISIT_NOT_FOUND" ||
      error.code === "INQUIRY_NOT_FOUND" ||
      error.code === "LISTING_NOT_FOUND" ||
      error.status === 404
    ) {
      if (error.code === "VISIT_NOT_FOUND") {
        return "The requested visit could not be found.";
      }
      if (error.code === "INQUIRY_NOT_FOUND") {
        return "The requested inquiry could not be found.";
      }
      if (error.code === "LISTING_NOT_FOUND") {
        return "The requested property could not be found.";
      }
      return "The requested item could not be found or has expired.";
    }
    if (
      error.code === "SERVICE_UNAVAILABLE" ||
      error.status === 503 ||
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
