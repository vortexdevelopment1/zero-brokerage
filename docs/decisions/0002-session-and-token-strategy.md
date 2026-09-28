# ADR 0002 — Session and Token Strategy

## Status

Accepted

## Context

Zero Brokerage requires a coherent authentication and session management architecture that satisfies the following requirements:

- Web and mobile application support across User App, Broker App, Website, and Super Admin panel.
- Rapid stateless access token verification for high-throughput API endpoints.
- Authoritative server-side session tracking capable of instant revocation, single session revocation, and global user logout ("logout all").
- Protection against refresh token replay attacks.
- Mobile storage safety and CSRF-resilient browser communication.

The Step 04 Blueprint mandates one coherent session/token strategy without overlapping redundant mechanisms.

## Decision

Zero Brokerage adopts a **Hybrid Server-Authoritative Token Pair Strategy** consisting of:

1. **Short-Lived JWT Access Tokens**:
   - Format: HMAC-SHA256 (HS256) JSON Web Token signed with a cryptographically secure server secret.
   - Lifetime: 15 minutes (900 seconds).
   - Payload: Contains `sub` (user UUID), `sessionId` (active session UUID), `role` (PlatformRole), `iat` (issued at UTC timestamp), and `exp` (expiration UTC timestamp).
   - Validation: Cryptographically verified on each request. Additionally, the Fastify authentication layer validates the corresponding session record in PostgreSQL to enforce real-time revocation and account status checks without waiting for JWT expiration.

2. **Opaque Rotating Refresh Tokens**:
   - Format: 32-byte cryptographically secure pseudorandom number generator (CSPRNG) hexadecimal string (64 characters).
   - Storage in Database: Stored exclusively as SHA-256 hashes (`refresh_token_hash`) in the `auth_sessions` table. Raw refresh tokens are never persisted in plaintext.
   - Lifetime: 30 days rolling sliding window from last rotation.
   - Rotation: Every call to `/api/v1/auth/refresh` or `/api/v1/auth/refresh-session` atomically consumes the presented refresh token and replaces it with a new cryptographically generated token pair.
   - **Atomic Concurrency Protection**: Rotation is guarded at the database level using atomic conditional updates (`WHERE id = $3 AND refresh_token_hash = $4 AND revoked_at IS NULL AND expires_at > NOW()`). If two concurrent requests present the identical refresh token simultaneously, exactly one succeeds and the other receives an immediate conflict rejection (HTTP 401).
   - Replay Protection: If an already-rotated or revoked token hash is presented, the server rejects the request with HTTP 401, flags the event as `SUSPICIOUS_ACTIVITY` in `auth_security_events`, and prevents unauthorized access.

3. **Distributed Single-Use Step-Up Security Tokens**:
   - Format: HMAC-SHA256 token binding `{ sub, sessionId, challengeId, nonce, purpose: "STEP_UP", exp }`.
   - Lifetime: 5 minutes (300 seconds).
   - Distributed Replay Protection: Nonce consumption is shared across horizontally scaled API instances using Redis with atomic `SET <key> 1 EX <ttl> NX` semantics. The TTL is bounded to the token lifetime and expired nonce keys are purged automatically by Redis. Subsequent attempts to consume the same nonce fail across all API instances with HTTP 403 `SECURITY_CHALLENGE_REQUIRED`.
   - Production Fail-Closed Behavior: If Redis replay-protection storage is unavailable or the atomic operation fails, the request fails closed; silent fallback to an in-memory map is strictly prohibited in production. Internal Redis errors are never exposed to API clients.
   - Resource Sharing: Step-up replay protection shares the existing `ioredis` connection established by the rate limiter via dependency injection/application composition, avoiding redundant connections. (The broader Redis infrastructure plugin remains deferred).

4. **Session Revocation & Logout**:
   - `logout`: Sets `revoked_at = NOW()` and `revocation_reason = 'LOGOUT'` for the current session.
   - `logout-all`: Sets `revoked_at = NOW()` across all active sessions belonging to the user.
   - `revoke-session`: Permits users to selectively terminate individual active sessions from another device.
   - `delete-account`: Immediately sets `revoked_at = NOW()` and `revocation_reason = 'ACCOUNT_DELETION_PENDING'` across all active sessions.

5. **Client-Side Storage**:
   - Mobile Clients (Flutter/React Native): Stored in OS-level hardware-backed secure storage (iOS Keychain, Android EncryptedSharedPreferences/Keystore).
   - Web Clients: Received via JSON payload over TLS and submitted via `Authorization: Bearer <token>` header, eliminating cross-site request forgery (CSRF) vulnerabilities inherent to ambient cookie transport.

## Consequences

- The backend remains the sole authoritative source for authentication and session validity.
- High-volume endpoints achieve rapid verification while preserving immediate revocation capability.
- Lost or compromised devices can be disconnected immediately through session revocation.
- Database storage costs remain minimal through indexed hash lookups and scheduled pruning of expired sessions.
