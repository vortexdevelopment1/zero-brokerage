import type { Migration } from "../src/index.js";

export const migration: Migration = {
  id: "20260928_002_create_identity_and_auth_tables",

  async up(client) {
    // 1. Auth Identities (Core User Accounts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) NOT NULL UNIQUE,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETION_PENDING', 'DELETED')),
        role VARCHAR(30) NOT NULL DEFAULT 'USER'
          CHECK (role IN ('USER', 'INDEPENDENT_BROKER', 'AGENCY_BROKER', 'AGENCY_ADMIN', 'SUPER_ADMIN')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        deletion_scheduled_at TIMESTAMPTZ NULL
      );
    `);

    // 2. User Profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id UUID PRIMARY KEY REFERENCES auth_identities(id) ON DELETE CASCADE,
        full_name VARCHAR(100) NULL,
        email VARCHAR(255) NULL,
        avatar_url TEXT NULL,
        preferences JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. OTP Challenges
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_otp_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) NOT NULL,
        purpose VARCHAR(50) NOT NULL DEFAULT 'AUTHENTICATION'
          CHECK (purpose IN ('AUTHENTICATION', 'CHANGE_PHONE', 'SENSITIVE_ACTION', 'ACCOUNT_DELETION')),
        code_hash VARCHAR(128) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED', 'SUPERSEDED')),
        consumed_at TIMESTAMPTZ NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_otp_phone_status ON auth_otp_challenges(phone, status);
      CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON auth_otp_challenges(expires_at);
    `);

    // 4. Auth Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_identities(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(128) NOT NULL UNIQUE,
        device_info VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ NULL,
        revocation_reason VARCHAR(100) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(refresh_token_hash);
    `);

    // 5. Agency Memberships
    await client.query(`
      CREATE TABLE IF NOT EXISTS agency_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID NOT NULL,
        user_id UUID NOT NULL REFERENCES auth_identities(id) ON DELETE CASCADE,
        role VARCHAR(30) NOT NULL DEFAULT 'MEMBER'
          CHECK (role IN ('ADMIN', 'MANAGER', 'BROKER', 'MEMBER')),
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'TERMINATED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_user_unique ON agency_memberships(agency_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_agency_memberships_user ON agency_memberships(user_id);
    `);

    // 6. Broker Verifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS broker_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES auth_identities(id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL DEFAULT 'UNSUBMITTED'
          CHECK (status IN ('UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVERIFICATION_REQUIRED')),
        license_number VARCHAR(100) NULL,
        document_urls JSONB NOT NULL DEFAULT '[]',
        rejection_reason TEXT NULL,
        reviewed_by UUID NULL REFERENCES auth_identities(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Security Events & Auditability
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        user_id UUID NULL REFERENCES auth_identities(id) ON DELETE SET NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_security_events_user ON auth_security_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_events_type ON auth_security_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_security_events_created ON auth_security_events(created_at);
    `);
  },

  async down(client) {
    await client.query(`
      DROP TABLE IF EXISTS auth_security_events;
      DROP TABLE IF EXISTS broker_verifications;
      DROP TABLE IF EXISTS agency_memberships;
      DROP TABLE IF EXISTS auth_sessions;
      DROP TABLE IF EXISTS auth_otp_challenges;
      DROP TABLE IF EXISTS user_profiles;
      DROP TABLE IF EXISTS auth_identities;
    `);
  },
};
