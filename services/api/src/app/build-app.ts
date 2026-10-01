import Fastify, { type FastifyServerOptions, LogController } from "fastify";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import databasePlugin from "../plugins/database.js";
import errorHandlerPlugin from "../plugins/error-handler.js";
import rateLimitPlugin from "../plugins/rate-limit.js";
import authenticationPlugin from "../plugins/authentication.js";
import authorizationPlugin from "../plugins/authorization.js";
import requestContextPlugin from "../plugins/request-context.js";
import swaggerPlugin from "../plugins/swagger.js";
import {
  REQUEST_ID_HEADER,
  createRequestId,
  createValidatorCompiler,
} from "../common/http/contracts.js";
import { env } from "../config/env.js";

import { registerHooks } from "./register-hooks.js";
import { registerModules } from "./register-modules.js";
import { registerRoutes } from "./register-routes.js";

export interface BuildAppOptions {
  logger?: FastifyServerOptions["logger"];
  idempotencyStore?: import("../common/http/idempotency/types.js").IdempotencyStore;
  rateLimiter?: import("../modules/identity/rate-limiting/rate-limiter.js").RateLimiter;
  bodyLimit?: number;
  trustProxy?: FastifyServerOptions["trustProxy"];
  corsAllowedOrigins?: string[];
}

export async function buildApp(options: BuildAppOptions = {}) {
  // 1. Trust proxy configuration
  const trustProxySetting =
    options.trustProxy ??
    (env.TRUST_PROXY === "true"
      ? true
      : env.TRUST_PROXY === "false"
        ? false
        : env.TRUST_PROXY);

  // 2. Request body limit (explicit default: 1 MB = 1,048,576 bytes)
  const bodyLimit = options.bodyLimit ?? env.MAX_BODY_LIMIT_BYTES ?? 1048576;

  const app = Fastify({
    logger: options.logger ?? true,
    logController: new LogController({ disableRequestLogging: true }),
    requestIdHeader: false,
    trustProxy: trustProxySetting,
    bodyLimit,
    genReqId: (request) => createRequestId(request.headers[REQUEST_ID_HEADER]),
    schemaController: {
      compilersFactory: {
        buildValidator: createValidatorCompiler as any,
      },
    },
  });

  // 3. Request context and error handling
  await app.register(requestContextPlugin);
  await app.register(errorHandlerPlugin);

  // 4. Secure HTTP response headers (API-tailored Helmet configuration)
  await app.register(helmet, {
    contentSecurityPolicy: false, // Pure REST API server (avoid HTML browser CSP pollution)
    frameguard: { action: "deny" },
    xContentTypeOptions: true,
    dnsPrefetchControl: { allow: false },
    xDownloadOptions: true,
    referrerPolicy: { policy: "no-referrer" },
    hsts:
      env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
  });

  // 5. Strict, production-safe CORS policy
  const allowedOriginsList =
    options.corsAllowedOrigins ??
    (env.CORS_ALLOWED_ORIGINS
      ? env.CORS_ALLOWED_ORIGINS.split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []);

  await app.register(cors, {
    origin: (origin, cb) => {
      // Requests without Origin header (native mobile apps, curl, server-to-server) are permitted
      if (!origin) {
        return cb(null, true);
      }

      if (env.NODE_ENV === "production") {
        // In production, strictly require matching declared allowlist
        if (allowedOriginsList.includes(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      }

      // In development / test: allow declared origins or local dev origins
      if (
        allowedOriginsList.length > 0
          ? allowedOriginsList.includes(origin)
          : /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }

      return cb(null, false);
    },
    credentials: true,
  });

  // 6. OpenAPI Documentation Plugin
  await app.register(swaggerPlugin);

  // 7. Core persistence and infrastructure plugins
  await app.register(databasePlugin, {
    ...(options.idempotencyStore
      ? { idempotencyStore: options.idempotencyStore }
      : {}),
  });

  await app.register(rateLimitPlugin, {
    ...(options.rateLimiter ? { rateLimiter: options.rateLimiter } : {}),
  });

  await app.register(authenticationPlugin);
  await app.register(authorizationPlugin);

  // 8. Lifecycle hooks, domain modules, and route registration
  registerHooks(app);
  await registerModules(app);
  await registerRoutes(app);

  return app;
}
