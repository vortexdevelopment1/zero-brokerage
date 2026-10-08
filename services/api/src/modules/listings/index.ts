import type { FastifyInstance } from "fastify";
import { registerPropertyRoutes } from "./routes/property-routes.js";
import { registerListingRoutes } from "./routes/listing-routes.js";

export * from "./types.js";
export * from "./repositories/property-repository.js";
export * from "./repositories/listing-repository.js";
export * from "./services/property-service.js";
export * from "./services/listing-service.js";

export async function registerListingsModule(app: FastifyInstance): Promise<void> {
  await registerPropertyRoutes(app);
  await registerListingRoutes(app);
}
