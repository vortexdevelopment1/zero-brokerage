import type { Migration } from "../src/index.js";

export const migration: Migration = {
  id: "20260929_003_create_outbox_table",

  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name VARCHAR(100) NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        aggregate_id VARCHAR(100) NOT NULL,
        correlation_id VARCHAR(100) NOT NULL,
        causation_id VARCHAR(100) NULL,
        actor JSONB NULL,
        ownership JSONB NULL,
        payload JSONB NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')),
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        claimed_at TIMESTAMPTZ NULL,
        claimed_by VARCHAR(100) NULL,
        processed_at TIMESTAMPTZ NULL,
        last_error TEXT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_events_dispatch
        ON outbox_events (status, available_at)
        WHERE status IN ('PENDING', 'FAILED');

      CREATE INDEX IF NOT EXISTS idx_outbox_events_claimed
        ON outbox_events (status, claimed_at)
        WHERE status = 'PROCESSING';

      CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate
        ON outbox_events (aggregate_id, event_name);
    `);
  },
};
