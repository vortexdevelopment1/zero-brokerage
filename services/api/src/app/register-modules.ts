import type { FastifyInstance } from "fastify";
import { registerIdentityModule } from "../modules/identity/index.js";

export async function registerModules(app: FastifyInstance): Promise<void> {
  await registerIdentityModule(app);
}
