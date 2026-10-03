# PostgreSQL Backup & Disaster Recovery Runbook

## Purpose

This document establishes the operational backup, disaster recovery, and data restoration runbook for the Zero Brokerage PostgreSQL database. It outlines recovery targets, backup mechanisms, storage security, verification testing, step-by-step restoration procedures, and implementation boundaries.

---

## 1. Objectives & Recovery Targets

| Metric | Approved Status | Policy & Implementation Definition |
| :--- | :--- | :--- |
| **Recovery Time Objective (RTO)** | **≤ 24 hours (Approved Baseline)** | Initial approved recovery target: Recovery Time Objective is **≤ 24 hours** unless a stricter target is explicitly approved in later operational planning. |
| **Recovery Point Objective (RPO)** | **OPEN / TBD** | Exact RPO is currently **OPEN/TBD**. The repository does not currently implement continuous WAL archiving or streaming replication. Specific RPO targets (e.g. 15 minutes or 1 hour) are deferred to Step 12 operational engineering once continuous archiving infrastructure is provisioned. Near-zero RPO is **not** claimed. |
| **Disaster Recovery Strategy** | **Backup + Tested Restoration** | Cold disaster recovery based on scheduled full logical backups (`pg_dump`) combined with documented, tested manual restoration procedures. Automatic failover is **not** currently implemented. |
| **Recovery Owner** | **Database Engineering / DevOps On-Call** | Designee responsible for initiating restoration procedures, managing dependencies, and verifying data integrity. |

---

## 2. Backup Strategy & Operational Mechanisms

### 2.1 Supported & Implemented Mechanisms
1. **Logical Snapshot Backups (`pg_dump`)**:
   - **Current Operational Mechanism**: PostgreSQL custom format archive (`-Fc`), enabling compressed point-in-time snapshots and parallel schema/data restoration.
   - Executed via manual or scripted operational procedures during maintenance windows.
2. **Continuous WAL Archiving & Physical Replication (`pg_basebackup`)**:
   - **Future Operational Mechanism (Not Currently Implemented)**: Required for point-in-time recovery (PITR) and stricter RPO. Continuous WAL streaming to off-site object storage is planned for Step 12 production infrastructure and is not operational in the current codebase.

### 2.2 Backup Frequency Guidelines (Target Policy)
- **Daily Full Logical Snapshot**: Target schedule is a daily full logical backup during low-traffic operational windows.
- **Pre-Migration Snapshot**: Mandatory manual snapshot taken immediately prior to applying production database migrations.

### 2.3 Storage & Failure Boundary Isolation
- **Separate Failure Domain**: Backup archives must be stored outside the primary database host disk.
- **Target Off-Site Storage**: Backups must be copied to an isolated cloud object storage bucket (e.g. AWS S3 / Google Cloud Storage) located in an independent failure boundary.
- **Immutability (Target)**: Production backup buckets should enforce object-lock / WORM retention to prevent unauthorized deletion or tampering.

### 2.4 Encryption & Access Control
- **Encryption in Transit**: TLS 1.3 mandated for all backup file transfers and remote database connections.
- **Encryption at Rest**: Backup archives must be encrypted at rest (AES-256) using dedicated KMS keys.
- **Access Control**: Principle of least privilege. Backup execution must use a dedicated database user with read-only data inspection privileges (`pg_read_all_data`), avoiding superuser access.

---

## 3. Operational Backup Procedures

### 3.1 Logical Backup Script Template (`pg_dump`)
Execute the logical backup script from a designated maintenance environment:
```bash
# Set secure environment variables
export PGPASSWORD="${BACKUP_DB_PASSWORD}"
BACKUP_TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="zero_brokerage_backup_${BACKUP_TIMESTAMP}.dump"

# Execute compressed custom-format pg_dump
pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}" \
  "${DB_NAME}"

# Generate SHA-256 checksum manifest
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

# Verify dump file integrity locally before copy
pg_restore --list "${BACKUP_FILE}" > /dev/null

# Clean local scratch credentials
unset PGPASSWORD
```

---

## 4. Step-by-Step Restoration Runbook

In the event of database hardware failure, data corruption, or scheduled recovery drills, follow this exact sequential procedure:

### Phase 1: Preparation & Target Isolation
1. **Declare Incident**: Notify platform engineering and halt upstream API traffic to prevent partial state writes.
2. **Provision Target Host**: Ensure PostgreSQL 18.x and PostGIS 3.x are installed on the clean target host.
3. **Verify Checksum**: Verify the SHA-256 checksum manifest of the designated backup file before attempting restoration:
   ```bash
   sha256sum -c "${TARGET_BACKUP_FILE}.sha256" # Must return OK
   ```

### Phase 2: Database Initialization & Extension Dependency Order
Before restoring domain tables, the database and required technical extensions must be initialized in exact dependency order:
```sql
-- 1. Create clean target database
CREATE DATABASE zero_brokerage;
\c zero_brokerage;

-- 2. Mandatory PostGIS Extension Initialization (Migration 001 Dependency)
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Phase 3: Schema & Data Restoration (`pg_restore`)
Execute restoration using `pg_restore`:
```bash
export PGPASSWORD="${RESTORE_DB_PASSWORD}"

pg_restore \
  --host="${TARGET_DB_HOST}" \
  --port="${TARGET_DB_PORT:-5432}" \
  --username="${RESTORE_DB_USER}" \
  --dbname="${TARGET_DB_NAME}" \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  --verbose \
  "${TARGET_BACKUP_FILE}"

unset PGPASSWORD
```

### Phase 4: Data Integrity Verification Checklist
After restoration finishes, execute the following mandatory verification checks prior to redirecting application traffic:

```sql
-- Check 1: Verify all migrations are recorded and checksums intact
SELECT id, applied_at, checksum FROM schema_migrations ORDER BY applied_at ASC;

-- Check 2: Verify table record counts
SELECT 'auth_identities' AS tbl, count(*) FROM auth_identities
UNION ALL SELECT 'agencies', count(*) FROM agencies
UNION ALL SELECT 'properties', count(*) FROM properties
UNION ALL SELECT 'listings', count(*) FROM listings
UNION ALL SELECT 'outbox_events', count(*) FROM outbox_events;

-- Check 3: Verify PostGIS spatial column validity
SELECT id, title, ST_AsText(location) FROM properties LIMIT 5;

-- Check 4: Test spatial radius calculation on restored index
SELECT count(*) FROM properties
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography, 10000);
```

### Phase 5: Resuming Traffic
1. Update API connection string environment variables (`DATABASE_URL`).
2. Run database health checks via API `/health` endpoints.
3. Resume application and background worker traffic.

---

## 5. Roll-Forward vs. Rollback Decision Framework

When schema migrations or faulty application releases cause data corruption, evaluate whether to restore or roll forward:

```text
Did corruption affect critical data invariants?
               │
       ┌───────┴───────┐
       ▼               ▼
      NO              YES
       │               │
  Apply forward-   Can corruption be safely repaired
  only migration   via targeted SQL transaction script?
  or code patch        │
               ┌───────┴───────┐
               ▼               ▼
              YES              NO
               │               │
          Run surgical     Execute Full Database
          repair script    Point-in-Time Restoration
```

---

## 6. Implementation Status vs. Future Work

- **Step 03 Status (Current)**:
  - Standardized backup and disaster recovery runbook defined.
  - Manual and scripted `pg_dump` and `pg_restore` commands validated against PostgreSQL 18.6 and PostGIS 3.6.
  - Dependency restoration order established (PostGIS extension → `schema_migrations` → domain tables).
  - Disaster recovery model: Cold backup + tested restoration (no automated failover).
- **Step 12 Operational Scope (Future Work)**:
  - Automated cron scheduling for daily logical snapshots.
  - Continuous WAL archiving daemon to off-site cloud storage for granular RPO.
  - Periodic automated restoration drills into an isolated verification database.
  - Infrastructure-as-code (IaC) deployment pipelines and alerting on backup freshness.
