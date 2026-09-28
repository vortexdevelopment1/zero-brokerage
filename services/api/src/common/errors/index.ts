export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[] | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ErrorDetail[] | undefined,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: ErrorDetail[]) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: ErrorDetail[]) {
    super(401, "UNAUTHORIZED", message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: ErrorDetail[]) {
    super(403, "FORBIDDEN", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: ErrorDetail[]) {
    super(404, "NOT_FOUND", message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: ErrorDetail[]) {
    super(409, "CONFLICT", message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: ErrorDetail[]) {
    super(422, "VALIDATION_FAILED", message, details);
  }
}

export class RateLimitedError extends AppError {
  constructor(
    message = "Too many requests. Please try again later.",
    details?: ErrorDetail[],
  ) {
    super(429, "RATE_LIMITED", message, details);
  }
}

export class InvalidAccountStateError extends AppError {
  constructor(
    message = "Account is not in a valid state for this operation",
    details?: ErrorDetail[],
  ) {
    super(403, "INVALID_ACCOUNT_STATE", message, details);
  }
}

export class VerificationRequiredError extends AppError {
  constructor(
    message = "Broker verification is required for this operation",
    details?: ErrorDetail[],
  ) {
    super(403, "VERIFICATION_REQUIRED", message, details);
  }
}

export class EntitlementMissingError extends AppError {
  constructor(
    message = "An active subscription entitlement is required for this action",
    details?: ErrorDetail[],
  ) {
    super(403, "ENTITLEMENT_MISSING", message, details);
  }
}

export class SecurityChallengeRequiredError extends AppError {
  constructor(
    message = "Step-up security verification is required for this action",
    details?: ErrorDetail[],
  ) {
    super(403, "SECURITY_CHALLENGE_REQUIRED", message, details);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = "An unexpected internal server error occurred",
    details?: ErrorDetail[],
  ) {
    super(500, "INTERNAL_SERVER_ERROR", message, details);
  }
}
