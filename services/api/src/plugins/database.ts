import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import {
  createDatabasePool,
  type DatabaseClientOptions,
} from "@zero-brokerage/database";

import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof createDatabasePool>;
  }
}

export interface DatabasePluginOptions extends Omit<
  DatabaseClientOptions,
  "connectionString"
> {
  connectionString?: string;
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

  app.addHook("onClose", async () => {
    await pool.end();
  });
}

export default fp(databasePlugin, {
  name: "database",
});
