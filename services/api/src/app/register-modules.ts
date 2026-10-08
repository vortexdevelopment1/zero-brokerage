import type { FastifyInstance } from "fastify";
import { registerIdentityModule } from "../modules/identity/index.js";
import { registerAgenciesModule } from "../modules/agencies/index.js";
import { registerListingsModule } from "../modules/listings/index.js";
import { registerOperationsModule } from "../modules/operations/index.js";

export async function registerModules(app: FastifyInstance): Promise<void> {
  await registerIdentityModule(app);
  await registerAgenciesModule(app);
  await registerListingsModule(app);
  await registerOperationsModule(app);
}
