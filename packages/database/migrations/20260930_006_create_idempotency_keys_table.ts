import type { Migration } from "../src/index.js";

export const migration: Migration = {
  id: "20260930_006_create_idempotency_keys_table",

  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scope VARCHAR(200) NOT NULL,
        key VARCHAR(128) NOT NULL,
        fingerprint VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
          CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
        status_code INTEGER NULL,
        response_body JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );

      -- Unique constraint scoping idempotency key per authenticated scope (actor or agency:actor)
      CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_scope_key
        ON idempotency_keys (scope, key);

      -- Index supporting TTL expiration cleanup
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
        ON idempotency_keys (expires_at);
    `);
  },

  async down(client) {
    await client.query(`
      DROP TABLE IF EXISTS idempotency_keys;
    `);
  },
};
