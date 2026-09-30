import type { FastifyError } from "fastify";
import { ZodError } from "zod";
import { DatabaseError } from "@zero-brokerage/database";

import {
  type ErrorDetail,
  AppError,
  mapDatabaseErrorToAppError,
} from "../errors/index.js";
import {
  type ApiErrorCode,
  type ErrorDetails,
  type ErrorResponse,
  type RequestId,
  createCanonicalErrorResponse,
  isStableErrorCode,
} from "./contracts.js";

export type ErrorCategory =
  "application" | "database" | "framework" | "validation" | "unexpected";

export class ClassifiedHttpError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly publicMessage: string;
  public readonly publicDetails?: ErrorDetails | undefined;
  public readonly retryable?: boolean | undefined;
  public readonly category: ErrorCategory;
  public readonly causeError: Error;
  public readonly legacyCode: string;
  public readonly legacyMessage: string;
  public readonly legacyDetails?: ErrorDetail[] | undefined;

  constructor(input: {
    statusCode: number;
    code: ApiErrorCode;
    publicMessage: string;
    publicDetails?: ErrorDetails;
    retryable?: boolean;
    category: ErrorCategory;
    causeError: Error;
    legacyCode?: string;
    legacyMessage?: string;
    legacyDetails?: ErrorDetail[];
  }) {
    super(input.publicMessage);
    this.name = "ClassifiedHttpError";
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.publicMessage = input.publicMessage;
    this.publicDetails = input.publicDetails;
    this.retryable = input.retryable;
    this.category = input.category;
    this.causeError = input.causeError;
    this.legacyCode = input.legacyCode ?? input.code;
    this.legacyMessage = input.legacyMessage ?? input.publicMessage;
    this.legacyDetails = input.legacyDetails;
  }
}

function stableCodeOrInternal(code: string): ApiErrorCode {
  return isStableErrorCode(code) ? code : "INTERNAL_SERVER_ERROR";
}

function classifyAppError(
  error: AppError,
  category: ErrorCategory,
): ClassifiedHttpError {
  return new ClassifiedHttpError({
    statusCode: error.statusCode,
    code: stableCodeOrInternal(error.code),
    publicMessage: error.message,
    category,
    causeError: error,
    legacyCode: error.code,
    legacyMessage: error.message,
    ...(error.details ? { legacyDetails: error.details } : {}),
  });
}

/**
 * Converts raw errors into one reusable internal representation. Formatters
 * intentionally decide which, if any, classified information becomes public.
 */
import { normalizeFastifyValidationErrors } from "./validation.js";

export function classifyHttpError(
  error: FastifyError | Error,
): ClassifiedHttpError {
  if (error instanceof ClassifiedHttpError) {
    return error;
  }

  if (error instanceof DatabaseError) {
    return classifyAppError(mapDatabaseErrorToAppError(error), "database");
  }

  if (error instanceof AppError) {
    return classifyAppError(error, "application");
  }

  if (error instanceof ZodError) {
    const legacyDetails = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    const publicFields = error.issues.map((issue) => ({
      field: issue.path.join("."),
      code: issue.code.toUpperCase(),
      message: issue.message,
    }));

    return new ClassifiedHttpError({
      statusCode: 422,
      code: "VALIDATION_FAILED",
      publicMessage: "The request contains invalid values.",
      publicDetails: { fields: publicFields },
      retryable: false,
      category: "validation",
      causeError: error,
      legacyCode: "VALIDATION_FAILED",
      legacyMessage: "The request payload contains invalid values.",
      legacyDetails,
    });
  }

  const fastifyError = error as FastifyError;

  // Fastify / Ajv schema validation failures receive 422 Unprocessable Content
  if (
    fastifyError.code === "FST_ERR_VALIDATION" ||
    Array.isArray(fastifyError.validation)
  ) {
    const normalized = normalizeFastifyValidationErrors(
      fastifyError.validation,
      fastifyError.validationContext,
    );

    return new ClassifiedHttpError({
      statusCode: 422,
      code: "VALIDATION_FAILED",
      publicMessage: "The request contains invalid values.",
      publicDetails: { fields: normalized.fields },
      retryable: false,
      category: "validation",
      causeError: error,
      legacyCode: "VALIDATION_FAILED",
      legacyMessage: "The request payload contains invalid values.",
      legacyDetails: normalized.legacyDetails,
    });
  }

  // Transport and framework errors (malformed JSON, 400 bad request, 415 unsupported media)
  if (
    fastifyError.statusCode &&
    fastifyError.statusCode >= 400 &&
    fastifyError.statusCode < 500
  ) {
    return new ClassifiedHttpError({
      statusCode: fastifyError.statusCode,
      code: "BAD_REQUEST",
      publicMessage: "The request could not be processed.",
      retryable: false,
      category: "framework",
      causeError: error,
      legacyCode: fastifyError.code ?? "BAD_REQUEST",
      legacyMessage: fastifyError.message,
    });
  }

  return new ClassifiedHttpError({
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    publicMessage: "An internal server error occurred.",
    retryable: false,
    category: "unexpected",
    causeError: error,
  });
}

export function formatCanonicalHttpError(
  error: ClassifiedHttpError,
  requestId: RequestId,
): ErrorResponse {
  return createCanonicalErrorResponse({
    code: error.code,
    message: error.publicMessage,
    requestId,
    ...(error.publicDetails ? { details: error.publicDetails } : {}),
    ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
  });
}

/** Preserves the verified Step 04 error envelope during the compatibility window. */
export function formatLegacyStep04Error(
  error: ClassifiedHttpError,
  requestId: RequestId,
): Record<string, unknown> {
  return {
    success: false,
    error: {
      code: error.legacyCode,
      message: error.legacyMessage,
      ...(error.legacyDetails ? { details: error.legacyDetails } : {}),
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}
