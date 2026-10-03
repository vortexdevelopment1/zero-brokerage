import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import {
  createDatabasePool,
  type DatabaseClientOptions,
} from "@zero-brokerage/database";

import { env } from "../config/env.js";
import { PostgresIdempotencyStore } from "../common/http/idempotency/postgres-store.js";
import type { IdempotencyStore } from "../common/http/idempotency/types.js";

declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof createDatabasePool>;
    idempotencyStore: IdempotencyStore;
  }
}

export interface DatabasePluginOptions extends Omit<
  DatabaseClientOptions,
  "connectionString"
> {
  connectionString?: string;
  idempotencyStore?: IdempotencyStore;
}

async function databasePlugin(
  app: FastifyInstance,
  options: DatabasePluginOptions = {},
): Promise<void> {
  const databaseOptions: DatabaseClientOptions = {
    connectionString: options.connectionString ?? env.DATABASE_URL,
  };

  if (options.maxConnections !== undefined) {
    databaseOptions.maxConnections = options.maxConnections;
  }

  if (options.idleTimeoutMillis !== undefined) {
    databaseOptions.idleTimeoutMillis = options.idleTimeoutMillis;
  }

  if (options.connectionTimeoutMillis !== undefined) {
    databaseOptions.connectionTimeoutMillis = options.connectionTimeoutMillis;
  }

  const pool = createDatabasePool(databaseOptions);

  app.decorate("db", pool);
  app.decorate(
    "idempotencyStore",
    options.idempotencyStore ?? new PostgresIdempotencyStore(pool),
  );

  app.addHook("onClose", async () => {
    await pool.end();
  });
}

export default fp(databasePlugin, {
  name: "database",
});
