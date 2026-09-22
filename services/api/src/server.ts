import 'dotenv/config';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import { env } from './config/env.js';

const app = Fastify({
  logger: true,
});

await app.register(helmet);
await app.register(cors, {
  origin: true,
});

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'zero-brokerage-api',
    timestamp: new Date().toISOString(),
  };
});

const { PORT: port, HOST: host } = env;

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutdown signal received');

  await app.close();

  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
