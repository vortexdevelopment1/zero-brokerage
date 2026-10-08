import type { FastifyInstance } from "fastify";
import type { OtpDeliveryProvider } from "./providers/otp-provider.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { registerAdminRoutes } from "./routes/admin-routes.js";

export * from "./types.js";
export * from "./authorization/roles-and-permissions.js";
export * from "./authorization/agency-policy.js";
export * from "./authorization/broker-policy.js";
export * from "./authorization/ownership-policy.js";
export * from "./authorization/entitlements.js";
export * from "./services/auth-service.js";
export * from "./services/session-service.js";
export * from "./services/account-lifecycle-service.js";
export * from "./providers/otp-provider.js";
export * from "./rate-limiting/rate-limiter.js";
export * from "./utils/phone.js";
export * from "./utils/tokens.js";
export * from "./utils/crypto.js";

export async function registerIdentityModule(
  app: FastifyInstance,
  options?: { otpProvider?: OtpDeliveryProvider },
): Promise<void> {
  await registerAuthRoutes(app, options);
  await registerAdminRoutes(app, options);
}
