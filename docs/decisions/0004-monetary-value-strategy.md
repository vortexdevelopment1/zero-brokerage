# ADR 0004 — Monetary Value Strategy

## Status

Accepted (Finalized in Step 03 / Hardened in Batch 03 via Migration `20260930_005`)

---

## Context

Financial integrity is paramount in real estate transactions, commercial listing pricing, security deposits, maintenance fees, and subsequent rental/subscription payments. 

In software systems, improper representation of money causes severe operational, financial, and regulatory defects:
1. **Floating-Point Hazards (IEEE 754)**: Standard `FLOAT` and `DOUBLE PRECISION` types cannot accurately represent base-10 fractions (e.g. `0.1 + 0.2 = 0.30000000000000004`). In real estate transactions involving millions of rupees, accumulated floating-point inaccuracies cause accounting discrepancies and broken reconciliation.
2. **Ambiguous Major-Unit `NUMERIC` Types**: While PostgreSQL `NUMERIC(14, 2)` preserves decimal precision in the database, its client-side representation in Node.js drivers frequently falls back to floating-point numbers or third-party string parsing libraries. Furthermore, mixing major-unit representations with external payment gateways (which almost universally transact in integer minor units like paise or cents) introduces repetitive, error-prone multiplication and division by 100.
3. **Implicit Currency Assumptions**: Storing numbers without an explicit currency code creates multi-region ambiguities and exchange-rate calculation errors.

---

## Decision

Zero Brokerage establishes a strict, platform-wide monetary standard:

1. **Authoritative Storage as `BIGINT` Minor Units**:
   - All authoritative monetary values are persisted as 64-bit signed integers (`BIGINT`) representing the currency's smallest atomic unit (e.g., paise for INR, cents for USD).
   - In PostgreSQL: `BIGINT NOT NULL`.
   - In TypeScript: `bigint` (native Node.js BigInt primitive).
2. **Mandatory Explicit ISO Currency Code**:
   - Every monetary figure or grouped financial record must include an explicit ISO 4217 3-character uppercase currency code (e.g. `INR`).
   - In PostgreSQL: `VARCHAR(3) NOT NULL DEFAULT 'INR'` with `CHECK (length(currency) = 3)`.
3. **Prohibition of Floating-Point Money**:
   - `FLOAT`, `DOUBLE PRECISION`, `REAL`, `NUMERIC`, and `DECIMAL` are strictly prohibited as authoritative database types for monetary balances.
   - JavaScript `Number` floating-point arithmetic must never be used for authoritative financial mutations or totals.
4. **Non-Negative Value Constraints**:
   - Monetary amounts in core business records (such as property pricing and deposits) must be non-negative, enforced via database check constraints:
     - `CHECK (price_minor >= 0)`
     - `CHECK (security_deposit_minor IS NULL OR security_deposit_minor >= 0)`
     - `CHECK (maintenance_fee_minor IS NULL OR maintenance_fee_minor >= 0)`
   - Zero values are explicitly permitted where domain rules allow (e.g., zero security deposit). Negative balances (e.g., debits, adjustments) belong strictly to double-entry general ledger records introduced in financial domains (Step 09).

---

## Representation & Conversion Examples

| Commercial Amount | Currency | Minor Unit Ratio | Persisted Minor Unit (`price_minor`) | Persisted Currency (`currency`) |
| :--- | :--- | :--- | :--- | :--- |
| **₹1,499.00** (Rent/Fee) | INR | 100 paise = ₹1 | `149900` (BigInt) | `'INR'` |
| **₹25,000.00** (Deposit) | INR | 100 paise = ₹1 | `2500000` (BigInt) | `'INR'` |
| **₹1,50,00,000.00** (1.5 Cr Sale) | INR | 100 paise = ₹1 | `1500000000` (BigInt) | `'INR'` |
| **₹0.00** (No Maintenance Fee) | INR | 100 paise = ₹1 | `0` (BigInt) | `'INR'` |

---

## Implementation Standards in Application & Repositories

1. **TypeScript Native BigInt**:
   - Repositories and domain models must type monetary columns as `bigint`.
   - The PostgreSQL driver (`pg`) maps `int8` / `BIGINT` to string by default or can be parsed directly to native `BigInt` via `pg.types.setTypeParser(20, BigInt)`.
   - Repositories must never cast `BIGINT` to unsafe JavaScript `Number` if the value can exceed `Number.MAX_SAFE_INTEGER` (`9,007,199,254,740,991`).
2. **Boundary Conversion**:
   - User-facing presentation (e.g., formatting ₹14,990.00 for display) occurs exclusively at the UI/presentation boundary using localized currency formatters.
   - Input validation transforms incoming major units into minor units at the API controller boundary using integer arithmetic:
     ```typescript
     // Safe conversion from major units to minor units (paise)
     const priceMinor = BigInt(Math.round(majorAmount * 100));
     ```
3. **Calculation & Rounding Rules**:
   - All additions, subtractions, and integer multiplications are exact in `bigint`.
   - Where division is required (e.g., proportional tax, percentage splits), calculations must specify explicit rounding behavior (half-up or banker's rounding) and assign any remainder to an explicit variance/rounding adjustment bucket.
4. **Provider Identifier Separation**:
   - Payment gateway references (e.g., Razorpay payment ID, bank reference numbers) represent payment provider metadata and must remain separate columns from the monetary value. They must never be encoded into or derived from financial values.
5. **Immutability of Historical Financial Facts**:
   - Once a commercial transaction, invoice, or published listing version is finalized, historical monetary records must not be mutated in place. Price modifications generate new listing events or revision records.

---

## Consequences

- **Positives**:
  - Eliminates IEEE 754 precision loss and rounding errors.
  - Zero translation friction with payment gateways (Razorpay, Stripe, UPI) which operate natively in integer minor units.
  - Consistent database check constraints prevent corrupt negative amounts at the engine level.
  - High performance: 64-bit integer comparisons and arithmetic are natively supported by CPU hardware and PostgreSQL indexes.
- **Trade-offs**:
  - Developers must use explicit `BigInt` notation in TypeScript (`149900n`).
  - JSON does not natively support `bigint` serialization; API serialization layers must serialize large 64-bit integers as strings or formatted objects according to API contract standards (Step 05).
