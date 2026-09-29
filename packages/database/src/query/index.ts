import type {
  Pool,
  PoolClient,
  QueryConfig,
  QueryResult,
  QueryResultRow,
} from "pg";

type QueryExecutor = Pool | PoolClient;

export async function executeQuery<Row extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  query: string | QueryConfig,
  values?: unknown[],
): Promise<QueryResult<Row>> {
  if (typeof query === "string") {
    if (values === undefined) {
      return executor.query<Row>(query);
    }

    return executor.query<Row>(query, values);
  }

  return executor.query<Row>(query);
}
