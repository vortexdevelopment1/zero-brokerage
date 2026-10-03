import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";

/**
 * Production-ready OpenAPI 3.0.3 documentation plugin for Fastify.
 * Automatically generates the OpenAPI specification for all implemented external routes.
 * Strictly avoids placeholder or fake future endpoints.
 */
const swaggerPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Zero Brokerage API",
        description:
          "Zero Brokerage Shared Core Backend REST API documentation. Exposes foundational authentication, account lifecycle, administrative, and system endpoints.",
        version: "1.0.0",
      },
      servers: [
        {
          url: "/",
          description: "Current environment server",
        },
      ],
      tags: [
        {
          name: "Health",
          description: "Service health and readiness probes",
        },
        {
          name: "Authentication",
          description:
            "Phone-based OTP authentication, session management, and token refresh",
        },
        {
          name: "Account",
          description:
            "Authenticated account profile, phone migration, and deletion lifecycle",
        },
        {
          name: "Administrative",
          description:
            "Super Admin governance, verification, and step-up challenge flows",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "JWT access token passed in the Authorization header: 'Bearer <token>'. Obtained from verify-otp or session refresh.",
          },
        },
        schemas: {
          CanonicalSuccessMeta: {
            type: "object",
            required: ["requestId"],
            properties: {
              requestId: {
                type: "string",
                format: "uuid",
                example: "550e8400-e29b-41d4-a716-446655440000",
              },
            },
          },
          CanonicalPaginationMeta: {
            type: "object",
            required: ["requestId", "pagination"],
            properties: {
              requestId: {
                type: "string",
                format: "uuid",
                example: "550e8400-e29b-41d4-a716-446655440000",
              },
              pagination: {
                type: "object",
                required: ["hasMore", "nextCursor"],
                properties: {
                  hasMore: { type: "boolean", example: false },
                  nextCursor: {
                    type: "string",
                    nullable: true,
                    example: null,
                  },
                },
              },
            },
          },
          CanonicalError: {
            type: "object",
            required: ["error"],
            properties: {
              error: {
                type: "object",
                required: ["code", "message", "requestId", "retryable"],
                properties: {
                  code: {
                    type: "string",
                    example: "VALIDATION_FAILED",
                    description:
                      "Machine-readable uppercase snake_case error code",
                  },
                  message: {
                    type: "string",
                    example: "The request contains invalid values.",
                    description: "Human-readable public error message",
                  },
                  details: {
                    type: "object",
                    properties: {
                      fields: {
                        type: "array",
                        items: {
                          type: "object",
                          required: ["field", "code", "message"],
                          properties: {
                            field: { type: "string", example: "phone" },
                            code: { type: "string", example: "REQUIRED" },
                            message: {
                              type: "string",
                              example: "Phone number is required",
                            },
                          },
                        },
                      },
                    },
                  },
                  requestId: {
                    type: "string",
                    format: "uuid",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                  retryable: {
                    type: "boolean",
                    example: false,
                  },
                },
              },
            },
          },
          RateLimitExceededError: {
            type: "object",
            required: ["error"],
            properties: {
              error: {
                type: "object",
                required: ["code", "message", "requestId", "retryable"],
                properties: {
                  code: { type: "string", example: "RATE_LIMITED" },
                  message: {
                    type: "string",
                    example: "Too many requests. Please try again later.",
                  },
                  requestId: { type: "string", format: "uuid" },
                  retryable: { type: "boolean", example: false },
                },
              },
            },
          },
          Step04LegacyError: {
            type: "object",
            required: ["success", "error"],
            properties: {
              success: { type: "boolean", example: false },
              error: {
                type: "object",
                required: ["code", "message", "timestamp", "requestId"],
                properties: {
                  code: {
                    type: "string",
                    example: "BAD_REQUEST",
                    description: "Legacy Step 04 error code",
                  },
                  message: {
                    type: "string",
                    example: "The request is invalid.",
                    description: "Public-safe error message",
                  },
                  details: {
                    type: "object",
                    description: "Optional legacy error details",
                  },
                  timestamp: {
                    type: "string",
                    format: "date-time",
                    example: "2026-10-01T10:00:00.000Z",
                  },
                  requestId: {
                    type: "string",
                    format: "uuid",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
            },
          },
          Step04LegacyRateLimitError: {
            type: "object",
            required: ["success", "error"],
            properties: {
              success: { type: "boolean", example: false },
              error: {
                type: "object",
                required: ["code", "message", "timestamp", "requestId"],
                properties: {
                  code: { type: "string", example: "RATE_LIMITED" },
                  message: {
                    type: "string",
                    example: "Too many requests. Please try again later.",
                  },
                  timestamp: {
                    type: "string",
                    format: "date-time",
                    example: "2026-10-01T10:00:00.000Z",
                  },
                  requestId: {
                    type: "string",
                    format: "uuid",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
            },
          },
          RequestOtpRequest: {
            type: "object",
            required: ["phone"],
            properties: {
              phone: {
                type: "string",
                description:
                  "10-digit Indian phone number or normalized E.164 format (+91...)",
                example: "+919876543210",
              },
              purpose: {
                type: "string",
                enum: [
                  "AUTHENTICATION",
                  "CHANGE_PHONE",
                  "SENSITIVE_ACTION",
                  "ACCOUNT_DELETION",
                ],
                default: "AUTHENTICATION",
              },
            },
          },
          VerifyOtpRequest: {
            type: "object",
            required: ["challengeId", "code"],
            properties: {
              challengeId: {
                type: "string",
                format: "uuid",
                description:
                  "UUID challenge identifier received from request-otp",
              },
              code: {
                type: "string",
                minLength: 6,
                maxLength: 6,
                description: "6-digit verification code",
                example: "123456",
              },
              deviceInfo: {
                type: "string",
                maxLength: 255,
                description: "Optional client device descriptor",
              },
            },
          },
          RefreshSessionRequest: {
            type: "object",
            required: ["refreshToken"],
            properties: {
              refreshToken: {
                type: "string",
                description: "Opaque single-use refresh token",
              },
            },
          },
          ChangePhoneRequest: {
            type: "object",
            required: ["newPhone"],
            properties: {
              newPhone: {
                type: "string",
                description: "New 10-digit Indian phone number or E.164 format",
                example: "+919988776655",
              },
            },
          },
          ChangePhoneConfirmRequest: {
            type: "object",
            required: ["challengeId", "code"],
            properties: {
              challengeId: {
                type: "string",
                format: "uuid",
              },
              code: {
                type: "string",
                minLength: 6,
                maxLength: 6,
              },
            },
          },
          DeleteAccountRequest: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                maxLength: 500,
                description:
                  "Optional user-provided reason for account deletion",
              },
            },
          },
          StepUpVerifyRequest: {
            type: "object",
            required: ["challengeId", "code"],
            properties: {
              challengeId: {
                type: "string",
                format: "uuid",
              },
              code: {
                type: "string",
                minLength: 6,
                maxLength: 6,
              },
            },
          },
        },
      },
    },
    transform: ({ schema, url, route }) => {
      // 1. Skip internal or documentation routes
      if (url === "/api/v1/openapi.json" || schema?.hide) {
        return { schema: { hide: true }, url };
      }

      const method = Array.isArray(route.method)
        ? route.method[0]?.toUpperCase()
        : (route.method as string)?.toUpperCase();

      // 2. Health check route
      if (url === "/health" && method === "GET") {
        return {
          schema: {
            tags: ["Health"],
            summary: "Health Check",
            description: "Evaluates API service health and readiness",
            response: {
              200: {
                description: "API service is healthy and operating normally",
                type: "object",
                required: ["status", "service", "timestamp"],
                properties: {
                  status: { type: "string", example: "ok" },
                  service: { type: "string", example: "zero-brokerage-api" },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
          url,
        };
      }

      // 3. Step 04 Authentication and Identity routes
      if (url === "/api/v1/auth/request-otp" && method === "POST") {
        return {
          schema: {
            tags: ["Authentication"],
            summary: "Request OTP",
            description:
              "Dispatches a one-time verification password to the specified mobile phone. Rate-limited by IP.",
            body: { $ref: "#/components/schemas/RequestOtpRequest" },
            response: {
              200: {
                description: "OTP challenge created successfully",
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      challengeId: { type: "string", format: "uuid" },
                      expiresIn: { type: "number", example: 300 },
                    },
                  },
                },
              },
              400: {
                description: "Malformed phone number or parameters",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: {
                description: "Rate limit exceeded (Too many OTP requests)",
                headers: {
                  "Retry-After": {
                    type: "string",
                    description: "Cooldown seconds until next allowed attempt",
                  },
                },
                $ref: "#/components/schemas/Step04LegacyRateLimitError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/verify-otp" && method === "POST") {
        return {
          schema: {
            tags: ["Authentication"],
            summary: "Verify OTP and Authenticate",
            description:
              "Verifies OTP code and returns authenticated session token pair. Rate-limited by IP.",
            body: { $ref: "#/components/schemas/VerifyOtpRequest" },
            response: {
              200: {
                description: "Authentication successful",
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      user: { type: "object" },
                      tokens: {
                        type: "object",
                        properties: {
                          accessToken: { type: "string" },
                          refreshToken: { type: "string" },
                        },
                      },
                      isNewUser: { type: "boolean" },
                    },
                  },
                },
              },
              400: {
                description: "Invalid OTP format or missing challenge",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              401: {
                description: "Invalid or expired OTP code",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: {
                description:
                  "Rate limit exceeded (Too many verification attempts)",
                $ref: "#/components/schemas/Step04LegacyRateLimitError",
              },
            },
          },
          url,
        };
      }

      if (
        (url === "/api/v1/auth/refresh" ||
          url === "/api/v1/auth/refresh-session") &&
        method === "POST"
      ) {
        return {
          schema: {
            tags: ["Authentication"],
            summary: "Refresh Access Token",
            description:
              "Rotates the single-use refresh token and issues a new access token. Rate-limited by IP.",
            body: { $ref: "#/components/schemas/RefreshSessionRequest" },
            response: {
              200: {
                description: "Token refreshed successfully",
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                    },
                  },
                },
              },
              401: {
                description: "Refresh token is invalid or expired",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: {
                description: "Rate limit exceeded",
                $ref: "#/components/schemas/Step04LegacyRateLimitError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/logout" && method === "POST") {
        return {
          schema: {
            tags: ["Authentication"],
            summary: "Logout Current Session",
            description: "Revokes the active session token.",
            security: [{ bearerAuth: [] }],
            response: {
              200: { description: "Logged out successfully" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/logout-all" && method === "POST") {
        return {
          schema: {
            tags: ["Authentication"],
            summary: "Logout All Sessions",
            description:
              "Revokes all active sessions for the authenticated user.",
            security: [{ bearerAuth: [] }],
            response: {
              200: { description: "All sessions revoked successfully" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/me" && method === "GET") {
        return {
          schema: {
            tags: ["Account"],
            summary: "Get Current Profile",
            description: "Returns profile details for the authenticated user.",
            security: [{ bearerAuth: [] }],
            response: {
              200: { description: "User profile details" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/sessions" && method === "GET") {
        return {
          schema: {
            tags: ["Authentication"],
            summary: "List Active Sessions",
            description: "Returns all active sessions for the current user.",
            security: [{ bearerAuth: [] }],
            response: {
              200: { description: "Active user sessions list" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/sessions/:sessionId" && method === "DELETE") {
        return {
          schema: {
            tags: ["Authentication"],
            summary: "Revoke Session",
            description: "Revokes a specific session by ID.",
            security: [{ bearerAuth: [] }],
            params: {
              type: "object",
              required: ["sessionId"],
              properties: {
                sessionId: { type: "string", format: "uuid" },
              },
            },
            response: {
              200: { description: "Session revoked successfully" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              404: {
                description: "Session not found",
                $ref: "#/components/schemas/Step04LegacyError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/change-phone/request" && method === "POST") {
        return {
          schema: {
            tags: ["Account"],
            summary: "Request Phone Number Change",
            description:
              "Initiates phone migration flow by dispatching OTP to new number.",
            security: [{ bearerAuth: [] }],
            body: { $ref: "#/components/schemas/ChangePhoneRequest" },
            response: {
              200: { description: "Phone change challenge created" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: { $ref: "#/components/schemas/Step04LegacyRateLimitError" },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/change-phone/confirm" && method === "POST") {
        return {
          schema: {
            tags: ["Account"],
            summary: "Confirm Phone Number Change",
            description: "Verifies OTP and commits phone number migration.",
            security: [{ bearerAuth: [] }],
            body: { $ref: "#/components/schemas/ChangePhoneConfirmRequest" },
            response: {
              200: { description: "Phone number updated successfully" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: { $ref: "#/components/schemas/Step04LegacyRateLimitError" },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/delete-account" && method === "POST") {
        return {
          schema: {
            tags: ["Account"],
            summary: "Initiate Account Deletion",
            description:
              "Starts the 30-day account deletion grace period and revokes active sessions.",
            security: [{ bearerAuth: [] }],
            body: { $ref: "#/components/schemas/DeleteAccountRequest" },
            response: {
              200: { description: "Account deletion scheduled" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: { $ref: "#/components/schemas/Step04LegacyRateLimitError" },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/step-up/request" && method === "POST") {
        return {
          schema: {
            tags: ["Administrative"],
            summary: "Request Administrative Step-Up Challenge",
            description:
              "Issues challenge OTP for sensitive Super Admin actions.",
            security: [{ bearerAuth: [] }],
            response: {
              200: { description: "Step-up challenge dispatched" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              403: {
                description: "Forbidden - Requires SUPER_ADMIN role",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: { $ref: "#/components/schemas/Step04LegacyRateLimitError" },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/step-up/verify" && method === "POST") {
        return {
          schema: {
            tags: ["Administrative"],
            summary: "Verify Step-Up Challenge",
            description:
              "Verifies step-up OTP and mints single-use step-up token.",
            security: [{ bearerAuth: [] }],
            body: { $ref: "#/components/schemas/StepUpVerifyRequest" },
            response: {
              200: { description: "Step-up token minted" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              403: {
                description: "Forbidden",
                $ref: "#/components/schemas/Step04LegacyError",
              },
              429: { $ref: "#/components/schemas/Step04LegacyRateLimitError" },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/delete-account/cancel" && method === "POST") {
        return {
          schema: {
            tags: ["Account"],
            summary: "Cancel Account Deletion",
            description:
              "Cancels pending account deletion during the 30-day grace period.",
            security: [{ bearerAuth: [] }],
            response: {
              200: { description: "Account deletion cancelled successfully" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
            },
          },
          url,
        };
      }

      if (url === "/api/v1/auth/delete-account/finalize" && method === "POST") {
        return {
          schema: {
            tags: ["Account"],
            summary: "Finalize Account Deletion",
            description: "Permanently finalizes expired account deletion.",
            security: [{ bearerAuth: [] }],
            response: {
              200: { description: "Account permanently deleted" },
              401: {
                description: "Unauthorized",
                $ref: "#/components/schemas/Step04LegacyError",
              },
            },
          },
          url,
        };
      }

      // Default: Preserve any existing Fastify schema attached directly to route options
      return { schema, url };
    },
  });

  // Public endpoint serving the generated OpenAPI document
  app.get(
    "/api/v1/openapi.json",
    {
      schema: {
        hide: true,
      },
    },
    async (_request, reply) => {
      const spec = app.swagger();
      return reply
        .status(200)
        .header("content-type", "application/json")
        .send(spec);
    },
  );
};

export default fp(swaggerPlugin, {
  name: "swagger",
});
