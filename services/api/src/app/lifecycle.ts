import type { FastifyInstance } from 'fastify';

export function registerLifecycle(app: FastifyInstance): void {
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Shutdown signal received');

    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ error }, 'Failed to shut down server');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}
