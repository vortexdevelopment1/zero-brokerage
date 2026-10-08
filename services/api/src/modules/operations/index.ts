import type { FastifyInstance } from "fastify";
import { registerOperationsRoutes } from "./routes/operations-routes.js";

export * from "./types.js";
export * from "./repositories/operations-repository.js";
export * from "./services/operations-service.js";

export async function registerOperationsModule(app: FastifyInstance): Promise<void> {
  await registerOperationsRoutes(app);
}
