import type { Migration } from "./index.js";
import { migration as enablePostgis } from "../../migrations/20260925_001_enable_postgis.js";
import { migration as createIdentityAndAuth } from "../../migrations/20260928_002_create_identity_and_auth_tables.js";
import { migration as createOutboxTable } from "../../migrations/20260929_003_create_outbox_table.js";

export const allMigrations: readonly Migration[] = [
  enablePostgis,
  createIdentityAndAuth,
  createOutboxTable,
];
