import 'dotenv/config';

import { buildApp } from './app/build-app.js';
import { registerLifecycle } from './app/lifecycle.js';
import { env } from './config/env.js';

const app = await buildApp();

registerLifecycle(app);

try {
  await app.listen({
    port: env.PORT,
    host: env.HOST,
  });
} catch (error) {
  app.log.error({ error }, 'Failed to start server');
  process.exit(1);
}
