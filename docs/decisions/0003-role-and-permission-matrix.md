# ADR 0003 — Role and Action-Oriented Permission Matrix

## Status

Accepted

## Context

Zero Brokerage requires a robust authorization model across consumer users, independent brokers, agency brokers, agency administrators, and platform super administrators.

Traditional approaches that collapse authorization into unrestricted boolean flags (such as `is_admin`, `is_broker`) violate least-privilege principles and encourage client-side authorization leakage.

The Step 04 Blueprint mandates:

- Explicit separation between platform role, agency membership, resource ownership, broker verification state, and subscription entitlement.
- Fine-grained, action-oriented permissions mapped to platform roles.
- Multi-layered authorization evaluation where platform role is checked first, followed by domain-specific ownership and operational constraints.

## Decision

Zero Brokerage establishes five distinct platform roles and an authoritative action-oriented permission matrix:

### 1. Platform Roles

| Role                 | Scope & Description                                                                                                                                                            |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `USER`               | Consumer tenant or property buyer/owner looking to search, schedule visits, and manage their personal profile.                                                                 |
| `INDEPENDENT_BROKER` | Self-employed broker who creates listings, manages their own leads/visits, and submits credentials for RERA verification.                                                      |
| `AGENCY_BROKER`      | Broker affiliated with a brokerage firm/agency; shares agency lead access and creates agency listings.                                                                         |
| `AGENCY_ADMIN`       | Agency owner or designated manager authorized to manage agency profile, roster members, assign agency leads, and review agency analytics.                                      |
| `SUPER_ADMIN`        | Internal platform operations and governance personnel authorized to moderate listings, audit system events, manage platform users, and review broker verification submissions. |

### 2. Action-Oriented Permission Matrix

| Domain Permission      | Action Key                    | USER | INDEPENDENT_BROKER | AGENCY_BROKER | AGENCY_ADMIN | SUPER_ADMIN |
| :--------------------- | :---------------------------- | :--: | :----------------: | :-----------: | :----------: | :---------: |
| Profile View Own       | `profile:view_own`            |  ✓   |         ✓          |       ✓       |      ✓       |      ✓      |
| Profile Edit Own       | `profile:edit_own`            |  ✓   |         ✓          |       ✓       |      ✓       |      ✓      |
| Profile Delete Own     | `profile:delete_own`          |  ✓   |         ✓          |       ✓       |      ✓       |      -      |
| Listing Create         | `listing:create`              |  -   |         ✓          |       ✓       |      ✓       |      -      |
| Listing Edit Own       | `listing:edit_own`            |  -   |         ✓          |       ✓       |      ✓       |      -      |
| Listing Delete Own     | `listing:delete_own`          |  -   |         ✓          |       ✓       |      ✓       |      -      |
| Listing Moderate       | `listing:moderate`            |  -   |         -          |       -       |      -       |      ✓      |
| Listing Publish        | `listing:publish`             |  -   |         -          |       -       |      -       |      ✓      |
| Listing View All       | `listing:view_all`            |  -   |         -          |       -       |      -       |      ✓      |
| Lead Create            | `lead:create`                 |  ✓   |         -          |       -       |      -       |      -      |
| Lead View Own          | `lead:view_own`               |  ✓   |         ✓          |       ✓       |      ✓       |      -      |
| Lead Manage Own        | `lead:manage_own`             |  -   |         ✓          |       ✓       |      ✓       |      -      |
| Lead Assign Agency     | `lead:assign_agency`          |  -   |         -          |       -       |      ✓       |      -      |
| Lead View Agency       | `lead:view_agency`            |  -   |         -          |       ✓       |      ✓       |      -      |
| Visit Request          | `visit:request`               |  ✓   |         -          |       -       |      -       |      -      |
| Visit View Own         | `visit:view_own`              |  ✓   |         ✓          |       ✓       |      ✓       |      -      |
| Visit Manage Own       | `visit:manage_own`            |  -   |         ✓          |       ✓       |      ✓       |      -      |
| Visit Complete         | `visit:complete`              |  -   |         ✓          |       ✓       |      ✓       |      -      |
| Agency Create          | `agency:create`               |  -   |         -          |       -       |      -       |      ✓      |
| Agency Manage Profile  | `agency:manage_profile`       |  -   |         -          |       -       |      ✓       |      ✓      |
| Agency Manage Members  | `agency:manage_members`       |  -   |         -          |       -       |      ✓       |      ✓      |
| Agency Assign Roles    | `agency:assign_roles`         |  -   |         -          |       -       |      ✓       |      ✓      |
| Agency View Analytics  | `agency:view_analytics`       |  -   |         -          |       -       |      ✓       |      ✓      |
| Broker Verify Submit   | `broker:verify_submit`        |  -   |         ✓          |       ✓       |      ✓       |      -      |
| Broker Verify Review   | `broker:verify_review`        |  -   |         -          |       -       |      -       |      ✓      |
| Broker Suspend         | `broker:suspend`              |  -   |         -          |       -       |      -       |      ✓      |
| Subscription View      | `subscription:view_plans`     |  ✓   |         ✓          |       ✓       |      ✓       |      ✓      |
| Subscription Subscribe | `subscription:subscribe`      |  ✓   |         ✓          |       -       |      ✓       |      -      |
| Subscription Manage    | `subscription:manage_plans`   |  -   |         -          |       -       |      -       |      ✓      |
| Financial Settlement   | `financial:manage_settlement` |  -   |         -          |       -       |      -       |      ✓      |
| Admin Access Panel     | `admin:access_panel`          |  -   |         -          |       -       |      -       |      ✓      |
| Admin Manage Users     | `admin:manage_users`          |  -   |         -          |       -       |      -       |      ✓      |
| Admin Audit Logs       | `admin:view_audit_logs`       |  -   |         -          |       -       |      -       |      ✓      |
| Admin Settings         | `admin:manage_settings`       |  -   |         -          |       -       |      -       |      ✓      |
| Admin Operations       | `admin:system_operations`     |  -   |         -          |       -       |      -       |      ✓      |
| Review Create Verified | `review:create_verified`      |  ✓   |         ✓          |       ✓       |      -       |      -      |
| Review Moderate        | `review:moderate`             |  -   |         -          |       -       |      -       |      ✓      |

### 3. Layered Evaluation Rules

Permissions granted by the matrix represent the **Role Layer**. An operation is permitted if and only if all applicable authorization layers pass:

1. **Authentication Layer**: Valid session and active identity state.
2. **Platform Role / Permission Layer**: Role has the required permission action key.
3. **Agency Membership Layer**: For agency operations, active membership and valid role (`ADMIN`, `MANAGER`, `BROKER`, `MEMBER`).
4. **Resource Ownership Layer**: Current user must be the resource owner (or belong to the same agency), unless overridden by `SUPER_ADMIN`.
5. **Broker Verification Layer**: Commercial broker actions require verification status = `APPROVED`.
6. **Entitlement Layer**: Subscription quota / feature entitlement must be valid. Fails closed in production.
7. **Step-Up Challenge Layer**: High-risk administrative actions require short-lived, single-use step-up security verification.

### 4. Super Admin Step-Up and Sensitive Privilege Auditing

Administrative privilege alone does not authorize execution of critical commands. Operations classified as high-risk (e.g. `admin:system_operations`, `admin:manage_settings`, `broker:suspend`, `financial:manage_settlement`):

- Require step-up security challenge (`requireStepUp`), issuing a 5-minute single-use token tied strictly to the administrator's user ID and session.
- Enforce single-use replay protection across horizontally scaled API instances via Redis atomic `SET ... NX EX ...` consumption (`RedisStepUpNonceStore`), failing closed if Redis is unreachable.
- Automatically emit an `ADMIN_PRIVILEGE_USED` audit event with IP, user agent, and sanitized action metadata.

## Consequences

- Frontend claims of administrative privileges or broker roles are rejected by backend authorization checks.
- Fine-grained permission decorators (`requirePermission`) provide clear, reusable route guards across domain modules.
- Super admin rights are restricted to explicit operational commands with step-up verification and audit logging.
- Unrelated aliases (`SEARCH_EXPLORE`, `SAVED_MANAGE`, `LEADS_VIEW_ASSIGNED`) are strictly eliminated.
