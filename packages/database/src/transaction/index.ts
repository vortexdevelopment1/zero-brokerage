import type {
  Pool,
  PoolClient,
  QueryConfig,
  QueryResult,
  QueryResultRow,
} from "pg";
import { mapDatabaseError } from "../errors/index.js";

/**
 * Interface representing an active database transaction context.
 * Guarantees that all queries executed within this context participate
 * in the same underlying PostgreSQL transaction.
 */
export interface TransactionContext {
  readonly client: PoolClient;
  readonly isTransaction: true;
  readonly savepointDepth: number;

  /**
   * Executes a SQL query within this transaction.
   */
  query<R extends QueryResultRow = QueryResultRow, I extends unknown[] = unknown[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: I,
  ): Promise<QueryResult<R>>;

  /**
   * Executes a nested callback within a safe PostgreSQL SAVEPOINT.
   * If the callback fails, rolls back only to this savepoint, leaving
   * the outer transaction intact if the caller catches the error.
   */
  withSavepoint<T>(
    callback: (tx: TransactionContext) => Promise<T>,
  ): Promise<T>;
  withSavepoint<T>(
    name: string,
    callback: (tx: TransactionContext) => Promise<T>,
  ): Promise<T>;
}

class TransactionContextImpl implements TransactionContext {
  public readonly isTransaction = true as const;
  private savepointCounter = 0;

  constructor(
    public readonly client: PoolClient,
    public readonly savepointDepth: number = 0,
  ) {}

  async query<R extends QueryResultRow = QueryResultRow, I extends unknown[] = unknown[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: I,
  ): Promise<QueryResult<R>> {
    try {
      if (typeof queryTextOrConfig === "string") {
        if (values === undefined) {
          return await this.client.query<R>(queryTextOrConfig);
        }
        return await this.client.query<R>(queryTextOrConfig, values);
      }
      return await this.client.query<R>(queryTextOrConfig);
    } catch (err) {
      throw mapDatabaseError(err);
    }
  }

  async withSavepoint<T>(
    nameOrCallback: string | ((tx: TransactionContext) => Promise<T>),
    maybeCallback?: (tx: TransactionContext) => Promise<T>,
  ): Promise<T> {
    const customName =
      typeof nameOrCallback === "string" ? nameOrCallback : undefined;
    const callback =
      typeof nameOrCallback === "function" ? nameOrCallback : maybeCallback;

    if (!callback) {
      throw new Error("Savepoint requires a callback function");
    }

    this.savepointCounter += 1;
    const rawName =
      customName ?? `sp_${this.savepointDepth + 1}_${this.savepointCounter}`;

    // Strictly validate savepoint identifier to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(rawName)) {
      throw new Error(
        `Invalid savepoint identifier: "${rawName}". Must be alphanumeric and up to 63 chars.`,
      );
    }

    const savepointName = rawName;
    const nestedTx = new TransactionContextImpl(
      this.client,
      this.savepointDepth + 1,
    );

    await this.client.query(`SAVEPOINT ${savepointName}`);

    try {
      const result = await callback(nestedTx);
      await this.client.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      try {
        await this.client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      } catch (rollbackErr) {
        // If rollback to savepoint itself fails (e.g. fatal connection error), map and throw
        throw mapDatabaseError(rollbackErr);
      }
      throw mapDatabaseError(error);
    }
  }
}

/**
 * Type guard to check if an object is an active TransactionContext.
 */
export function isTransactionContext(
  obj: unknown,
): obj is TransactionContext {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isTransaction" in obj &&
    (obj as TransactionContext).isTransaction === true &&
    "client" in obj
  );
}

/**
 * Reusable transaction abstraction supporting:
 * 1. Root transaction acquisition from a Pool (BEGIN ... COMMIT / ROLLBACK)
 * 2. Unconditional client release without connection leaks
 * 3. Nested savepoint propagation when called within an existing TransactionContext
 * 4. Transparent PostgreSQL error mapping
 */
export async function withTransaction<T>(
  executor: Pool | PoolClient | TransactionContext,
  callback: (tx: TransactionContext) => Promise<T>,
): Promise<T> {
  // If already inside a TransactionContext, automatically nest using a savepoint
  if (isTransactionContext(executor)) {
    return executor.withSavepoint(callback);
  }

  // Check if executor is a single PoolClient (standalone client)
  const isPoolClient =
    typeof (executor as PoolClient).query === "function" &&
    typeof (executor as PoolClient).release === "function" &&
    !("connect" in executor);

  if (isPoolClient) {
    const client = executor as PoolClient;
    await client.query("BEGIN");
    const tx = new TransactionContextImpl(client, 0);

    try {
      const result = await callback(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw mapDatabaseError(error);
    }
  }

  // Root pool acquisition
  const pool = executor as Pool;
  const client = await pool.connect();
  const tx = new TransactionContextImpl(client, 0);

  try {
    await client.query("BEGIN");

    try {
      const result = await callback(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw mapDatabaseError(error);
    }
  } finally {
    client.release();
  }
}
