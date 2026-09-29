import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  UnauthorizedError,
  InvalidAccountStateError,
} from "../common/errors/index.js";
import { env } from "../config/env.js";
import { findIdentityById } from "../modules/identity/repositories/identity-repository.js";
import {
  findSessionById,
  updateSessionLastUsed,
} from "../modules/identity/repositories/session-repository.js";
import type {
  AuthenticatedUser,
  AuthSession,
} from "../modules/identity/types.js";
import { verifyAccessToken } from "../modules/identity/utils/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser | null;
    session?: AuthSession | null;
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

async function authenticationPlugin(app: FastifyInstance): Promise<void> {
  // Request decorator initialization
  app.decorateRequest("user", null);
  app.decorateRequest("session", null);

  // Authentication hook / preHandler
  const authenticate = async (
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Missing or malformed Authorization header. Expected 'Bearer <token>'.",
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError("Authentication token is empty.");
    }

    // 1. Verify cryptographic signature & expiration
    const payload = verifyAccessToken(token, env.JWT_SECRET);

    // 2. Validate session state in database (checks revocation & database-level expiration)
    const session = await findSessionById(app.db, payload.sessionId);
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedError(
        "Your session is no longer active. Please log in again.",
      );
    }

    // 3. Validate user account state
    const user = await findIdentityById(app.db, payload.sub);
    if (!user || user.status === "DELETED") {
      throw new UnauthorizedError("Account not found or inactive.");
    }

    if (user.status === "SUSPENDED") {
      throw new InvalidAccountStateError(
        "Your account has been suspended. Please contact support.",
      );
    }

    // Asynchronously bump last_used_at on the session (fire-and-forget for speed)
    updateSessionLastUsed(app.db, session.id).catch((err) => {
      request.log.warn(
        { err, sessionId: session.id },
        "Failed to update session last_used_at",
      );
    });

    // 4. Attach authenticated user and session to request context
    request.user = {
      id: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
      sessionId: session.id,
    };

    request.session = session;
  };

  app.decorate("authenticate", authenticate);
}

export default fp(authenticationPlugin, {
  name: "authentication",
  dependencies: ["database"],
});
