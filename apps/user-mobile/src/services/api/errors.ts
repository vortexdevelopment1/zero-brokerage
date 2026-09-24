export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "ABORTED"
  | "INVALID_RESPONSE"
  | "HTTP_ERROR"
  | "UNKNOWN_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: {
      status?: number;
      details?: unknown;
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
  }
}