import type { FastifyInstance } from "fastify";
import { registerAgencyRoutes } from "./routes/agency-routes.js";

export * from "./types.js";
export * from "./repositories/agency-repository.js";
export * from "./services/agency-service.js";

export async function registerAgenciesModule(app: FastifyInstance): Promise<void> {
  await registerAgencyRoutes(app);
}
