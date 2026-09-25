import { Pool, type PoolConfig } from "pg";

export interface DatabaseClientOptions {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function createDatabasePool(options: DatabaseClientOptions): Pool {
  const config: PoolConfig = {
    connectionString: options.connectionString,
    max: options.maxConnections ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
  };

  return new Pool(config);
}
