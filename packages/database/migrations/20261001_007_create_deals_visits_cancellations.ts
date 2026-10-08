import type { Migration } from "../src/index.js";

export const migration: Migration = {
  id: "20261001_007_create_deals_visits_cancellations",

  async up(client) {
    // 1. Deals Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
        listing_id UUID NULL REFERENCES listings(id) ON DELETE SET NULL,
        buyer_id UUID NOT NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
        broker_id UUID NULL REFERENCES auth_identities(id) ON DELETE SET NULL,
        agency_id UUID NULL REFERENCES agencies(id) ON DELETE SET NULL,
        deal_value_minor NUMERIC(14, 2) NOT NULL DEFAULT 0,
        token_amount_minor NUMERIC(14, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
        stage VARCHAR(50) NOT NULL DEFAULT 'TOKEN_PAID',
        agreement_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        review_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        user_agreement_url TEXT NULL,
        broker_agreement_url TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_deals_buyer_id ON deals(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_deals_broker_id ON deals(broker_id);
      CREATE INDEX IF NOT EXISTS idx_deals_property_id ON deals(property_id);
      CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
      CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC, id DESC);
    `);

    // 2. Visits Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
        visitor_id UUID NOT NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
        broker_id UUID NULL REFERENCES auth_identities(id) ON DELETE SET NULL,
        agency_id UUID NULL REFERENCES agencies(id) ON DELETE SET NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_visits_property_id ON visits(property_id);
      CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
    `);

    // 3. Cancellations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cancellations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        initiated_by_id UUID NOT NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
        reason TEXT NOT NULL,
        fee_amount_minor NUMERIC(14, 2) NOT NULL DEFAULT 0,
        penalty_amount_minor NUMERIC(14, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        refund_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        audit_trail JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cancellations_deal_id ON cancellations(deal_id);
      CREATE INDEX IF NOT EXISTS idx_cancellations_status ON cancellations(status);
    `);

    // 4. Urgent Requirements Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS urgent_requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
        property_type VARCHAR(50) NOT NULL,
        budget_max_minor NUMERIC(14, 2) NOT NULL DEFAULT 0,
        city VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_urgent_requirements_user_id ON urgent_requirements(user_id);
      CREATE INDEX IF NOT EXISTS idx_urgent_requirements_status ON urgent_requirements(status);
    `);
  },

  async down(client) {
    await client.query(`
      DROP TABLE IF EXISTS urgent_requirements;
      DROP TABLE IF EXISTS cancellations;
      DROP TABLE IF EXISTS visits;
      DROP TABLE IF EXISTS deals;
    `);
  },
};
