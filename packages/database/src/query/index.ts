import type {
  Pool,
  PoolClient,
  QueryConfig,
  QueryResult,
  QueryResultRow,
} from "pg";
import { mapDatabaseError } from "../errors/index.js";
import {
  type TransactionContext,
  isTransactionContext,
} from "../transaction/index.js";

export type QueryExecutor = Pool | PoolClient | TransactionContext;

export async function executeQuery<Row extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  query: string | QueryConfig,
  values?: unknown[],
): Promise<QueryResult<Row>> {
  try {
    if (isTransactionContext(executor)) {
      return await executor.query<Row>(query, values as unknown[]);
    }

    if (typeof query === "string") {
      if (values === undefined) {
        return await executor.query<Row>(query);
      }

      return await executor.query<Row>(query, values);
    }

    return await executor.query<Row>(query);
  } catch (error) {
    throw mapDatabaseError(error);
  }
}
