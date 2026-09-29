import type { Migration } from "../src/index.js";

export const migration: Migration = {
  id: "20260930_005_harden_agencies_properties_listings",

  async up(client) {
    // 1. Listings: Convert monetary fields to BIGINT minor units (P0-001)
    await client.query(`
      -- Add BIGINT minor unit columns
      ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS price_minor BIGINT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS security_deposit_minor BIGINT NULL,
        ADD COLUMN IF NOT EXISTS maintenance_fee_minor BIGINT NULL;

      -- Migrate existing numeric money data if columns exist
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'listings' AND column_name = 'price'
        ) THEN
          UPDATE listings SET
            price_minor = ROUND(price * 100)::BIGINT,
            security_deposit_minor = CASE WHEN security_deposit IS NOT NULL THEN ROUND(security_deposit * 100)::BIGINT ELSE NULL END,
            maintenance_fee_minor = CASE WHEN maintenance_fee IS NOT NULL THEN ROUND(maintenance_fee * 100)::BIGINT ELSE NULL END;

          ALTER TABLE listings
            DROP COLUMN price,
            DROP COLUMN security_deposit,
            DROP COLUMN maintenance_fee;
        END IF;
      END $$;

      -- Add non-negative monetary check constraints
      ALTER TABLE listings
        DROP CONSTRAINT IF EXISTS chk_listings_pricing,
        ADD CONSTRAINT chk_listings_price_minor CHECK (price_minor >= 0),
        ADD CONSTRAINT chk_listings_security_deposit_minor CHECK (security_deposit_minor IS NULL OR security_deposit_minor >= 0),
        ADD CONSTRAINT chk_listings_maintenance_fee_minor CHECK (maintenance_fee_minor IS NULL OR maintenance_fee_minor >= 0),
        ADD CONSTRAINT chk_listings_currency_code CHECK (length(currency) = 3);
    `);

    // 2. Properties: Establish DB-enforced coordinate consistency between lat/lon and PostGIS location
    await client.query(`
      -- Synchronization and invariant verification trigger
      CREATE OR REPLACE FUNCTION sync_property_coordinates()
      RETURNS TRIGGER AS $$
      BEGIN
        -- If location provided but lat/lon are missing, derive them
        IF NEW.location IS NOT NULL AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
          NEW.latitude := ST_Y(NEW.location::geometry);
          NEW.longitude := ST_X(NEW.location::geometry);
        -- If lat/lon provided but location is missing, derive location
        ELSIF NEW.location IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
          NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        END IF;

        -- If both location and coordinates are present, enforce strict consistency
        IF NEW.location IS NOT NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
          IF abs(ST_Y(NEW.location::geometry) - NEW.latitude) >= 0.000001 OR
             abs(ST_X(NEW.location::geometry) - NEW.longitude) >= 0.000001 THEN
            RAISE EXCEPTION 'Coordinate mismatch: latitude (%) and longitude (%) do not match PostGIS location (%, %)',
              NEW.latitude, NEW.longitude,
              ST_Y(NEW.location::geometry), ST_X(NEW.location::geometry)
              USING ERRCODE = '23514'; -- check_violation
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_properties_sync_coordinates ON properties;
      CREATE TRIGGER trg_properties_sync_coordinates
        BEFORE INSERT OR UPDATE ON properties
        FOR EACH ROW
        EXECUTE FUNCTION sync_property_coordinates();

      -- Database-level check constraint for coordinate consistency
      ALTER TABLE properties
        DROP CONSTRAINT IF EXISTS chk_properties_coordinate_consistency,
        ADD CONSTRAINT chk_properties_coordinate_consistency
        CHECK (
          abs(ST_Y(location::geometry) - latitude) < 0.000001
          AND abs(ST_X(location::geometry) - longitude) < 0.000001
        );
    `);
  },

  async down(client) {
    // Drop coordinate check and trigger
    await client.query(`
      ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_properties_coordinate_consistency;
      DROP TRIGGER IF EXISTS trg_properties_sync_coordinates ON properties;
      DROP FUNCTION IF EXISTS sync_property_coordinates();
    `);

    // Revert monetary columns to NUMERIC
    await client.query(`
      ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS price NUMERIC(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(14, 2) NULL,
        ADD COLUMN IF NOT EXISTS maintenance_fee NUMERIC(12, 2) NULL;

      UPDATE listings SET
        price = (price_minor / 100.0),
        security_deposit = CASE WHEN security_deposit_minor IS NOT NULL THEN (security_deposit_minor / 100.0) ELSE NULL END,
        maintenance_fee = CASE WHEN maintenance_fee_minor IS NOT NULL THEN (maintenance_fee_minor / 100.0) ELSE NULL END;

      ALTER TABLE listings
        DROP CONSTRAINT IF EXISTS chk_listings_price_minor,
        DROP CONSTRAINT IF EXISTS chk_listings_security_deposit_minor,
        DROP CONSTRAINT IF EXISTS chk_listings_maintenance_fee_minor,
        DROP CONSTRAINT IF EXISTS chk_listings_currency_code,
        DROP COLUMN IF EXISTS price_minor,
        DROP COLUMN IF EXISTS security_deposit_minor,
        DROP COLUMN IF EXISTS maintenance_fee_minor;
    `);
  },
};
