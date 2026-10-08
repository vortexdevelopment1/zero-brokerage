import type { Migration } from "./index.js";
import { migration as enablePostgis } from "../../migrations/20260925_001_enable_postgis.js";
import { migration as createIdentityAndAuth } from "../../migrations/20260928_002_create_identity_and_auth_tables.js";
import { migration as createOutboxTable } from "../../migrations/20260929_003_create_outbox_table.js";
import { migration as createAgenciesPropertiesListings } from "../../migrations/20260930_004_create_agencies_properties_listings.js";
import { migration as hardenAgenciesPropertiesListings } from "../../migrations/20260930_005_harden_agencies_properties_listings.js";
import { migration as createIdempotencyKeys } from "../../migrations/20260930_006_create_idempotency_keys_table.js";
import { migration as createDealsVisitsCancellations } from "../../migrations/20261001_007_create_deals_visits_cancellations.js";

export const allMigrations: readonly Migration[] = [
  enablePostgis,
  createIdentityAndAuth,
  createOutboxTable,
  createAgenciesPropertiesListings,
  hardenAgenciesPropertiesListings,
  createIdempotencyKeys,
  createDealsVisitsCancellations,
];
