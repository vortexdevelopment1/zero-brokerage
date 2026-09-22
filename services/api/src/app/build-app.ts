import Fastify from 'fastify';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { registerHooks } from './register-hooks.js';
import { registerModules } from './register-modules.js';
import { registerRoutes } from './register-routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(helmet);

  await app.register(cors, {
    origin: true,
  });

  registerHooks(app);
  await registerModules(app);
  await registerRoutes(app);

  return app;
}
