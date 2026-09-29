import type { Migration } from "../src/index.js";

export const migration: Migration = {
  id: "20260930_004_create_agencies_properties_listings",

  async up(client) {
    // 1. Agencies Table (Agencies Module)
    await client.query(`
      CREATE TABLE IF NOT EXISTS agencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255) NULL,
        license_number VARCHAR(100) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'TERMINATED')),
        email VARCHAR(255) NULL,
        phone VARCHAR(20) NULL,
        address_line_1 VARCHAR(255) NULL,
        address_line_2 VARCHAR(255) NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        postal_code VARCHAR(20) NULL,
        country_code VARCHAR(2) NOT NULL DEFAULT 'IN',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_agencies_slug ON agencies (slug);
      CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies (status);
      CREATE INDEX IF NOT EXISTS idx_agencies_created_at ON agencies (created_at DESC, id DESC);
    `);

    // 2. Agency Memberships Updates (Referential Integrity & Invariants)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_agency_memberships_agency'
        ) THEN
          ALTER TABLE agency_memberships
            ADD CONSTRAINT fk_agency_memberships_agency
            FOREIGN KEY (agency_id) REFERENCES agencies(id)
            ON DELETE RESTRICT;
        END IF;
      END $$;

      ALTER TABLE agency_memberships DROP CONSTRAINT IF EXISTS agency_memberships_role_check;
      ALTER TABLE agency_memberships ADD CONSTRAINT agency_memberships_role_check
        CHECK (role IN ('ADMIN', 'MANAGER', 'BROKER', 'MEMBER', 'AGENCY_OWNER'));

      CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_active_owner
        ON agency_memberships (agency_id)
        WHERE role = 'AGENCY_OWNER' AND status = 'ACTIVE';

      CREATE UNIQUE INDEX IF NOT EXISTS uq_user_active_membership
        ON agency_memberships (user_id)
        WHERE status = 'ACTIVE';

      CREATE INDEX IF NOT EXISTS idx_agency_memberships_agency_status
        ON agency_memberships (agency_id, status);
    `);

    // 3. Properties Table (Underlying Real-World Asset)
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_type VARCHAR(50) NOT NULL
          CHECK (property_type IN ('RESIDENTIAL', 'COMMERCIAL', 'LAND')),
        sub_type VARCHAR(50) NOT NULL
          CHECK (sub_type IN (
            'APARTMENT', 'PENTHOUSE', 'VILLA', 'BUILDER_FLOOR',
            'OFFICE', 'CO_WORKING', 'RETAIL', 'COMMERCIAL_BUILDING',
            'AGRICULTURAL_LAND', 'INDUSTRIAL_PLOT', 'COMMERCIAL_PLOT'
          )),
        title VARCHAR(255) NULL,
        address_line_1 VARCHAR(255) NOT NULL,
        address_line_2 VARCHAR(255) NULL,
        locality VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country_code VARCHAR(2) NOT NULL DEFAULT 'IN',
        latitude DOUBLE PRECISION NOT NULL
          CHECK (latitude >= -90.0 AND latitude <= 90.0),
        longitude DOUBLE PRECISION NOT NULL
          CHECK (longitude >= -180.0 AND longitude <= 180.0),
        location geography(Point, 4326) NOT NULL,
        built_up_area NUMERIC(10, 2) NULL CHECK (built_up_area IS NULL OR built_up_area > 0),
        carpet_area NUMERIC(10, 2) NULL CHECK (carpet_area IS NULL OR carpet_area > 0),
        plot_area NUMERIC(10, 2) NULL CHECK (plot_area IS NULL OR plot_area > 0),
        area_unit VARCHAR(20) NOT NULL DEFAULT 'SQ_FT'
          CHECK (area_unit IN ('SQ_FT', 'SQ_M', 'ACRES', 'HECTARES', 'SQ_YD')),
        bedroom_count INTEGER NULL CHECK (bedroom_count IS NULL OR bedroom_count >= 0),
        bathroom_count INTEGER NULL CHECK (bathroom_count IS NULL OR bathroom_count >= 0),
        balcony_count INTEGER NULL CHECK (balcony_count IS NULL OR balcony_count >= 0),
        floor_number INTEGER NULL,
        total_floors INTEGER NULL CHECK (total_floors IS NULL OR total_floors >= 0),
        furnishing_status VARCHAR(30) NULL
          CHECK (furnishing_status IS NULL OR furnishing_status IN ('UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED')),
        amenities JSONB NOT NULL DEFAULT '[]',
        attributes JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS idx_properties_location_gist ON properties USING GIST (location);
      CREATE INDEX IF NOT EXISTS idx_properties_type_sub_type ON properties (property_type, sub_type);
      CREATE INDEX IF NOT EXISTS idx_properties_city_locality ON properties (city, locality);
      CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties (created_at DESC, id DESC);
    `);

    // 4. Listings Table (Commercial Offer for a Property)
    await client.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
        owner_type VARCHAR(30) NOT NULL
          CHECK (owner_type IN ('INDEPENDENT_BROKER', 'AGENCY', 'DIRECT_OWNER')),
        agency_id UUID NULL REFERENCES agencies(id) ON DELETE RESTRICT,
        broker_id UUID NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
        listing_intent VARCHAR(30) NOT NULL
          CHECK (listing_intent IN ('SALE', 'RENT', 'LEASE')),
        title VARCHAR(255) NULL,
        description TEXT NULL,
        price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        price_period VARCHAR(20) NULL
          CHECK (price_period IS NULL OR price_period IN ('MONTHLY', 'YEARLY', 'DAILY', 'ONE_TIME')),
        security_deposit NUMERIC(14, 2) NULL CHECK (security_deposit IS NULL OR security_deposit >= 0),
        maintenance_fee NUMERIC(14, 2) NULL CHECK (maintenance_fee IS NULL OR maintenance_fee >= 0),
        is_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
        available_from DATE NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
          CHECK (status IN (
            'DRAFT', 'PENDING_VERIFICATION', 'PENDING_MODERATION',
            'PUBLISHED', 'SUSPENDED', 'EXPIRED', 'ARCHIVED',
            'REJECTED', 'WITHDRAWN'
          )),
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        created_by UUID NOT NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
        updated_by UUID NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
        published_at TIMESTAMPTZ NULL,
        expires_at TIMESTAMPTZ NULL,
        archived_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT chk_listings_agency_owner_requires_agency
          CHECK (owner_type != 'AGENCY' OR agency_id IS NOT NULL),

        CONSTRAINT chk_listings_broker_owner_requires_broker
          CHECK (owner_type != 'INDEPENDENT_BROKER' OR broker_id IS NOT NULL)
      );

      CREATE INDEX IF NOT EXISTS idx_listings_property_id ON listings (property_id);
      CREATE INDEX IF NOT EXISTS idx_listings_agency_id ON listings (agency_id) WHERE agency_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_listings_broker_id ON listings (broker_id) WHERE broker_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
      CREATE INDEX IF NOT EXISTS idx_listings_intent_status ON listings (listing_intent, status);
      CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price, id);
      CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at DESC, id DESC);
    `);
  },

  async down(client) {
    await client.query(`
      DROP TABLE IF EXISTS listings;
      DROP TABLE IF EXISTS properties;
      DROP INDEX IF EXISTS idx_agency_memberships_agency_status;
      DROP INDEX IF EXISTS uq_user_active_membership;
      DROP INDEX IF EXISTS uq_agency_active_owner;
      ALTER TABLE agency_memberships DROP CONSTRAINT IF EXISTS fk_agency_memberships_agency;
      DROP TABLE IF EXISTS agencies;
    `);
  },
};
