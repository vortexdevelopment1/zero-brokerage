# Security Guidelines

## Purpose
Overview of security architecture, authentication standards, secret handling, and compliance policies.

## Key Security Pillars
* **Authentication**: Token-based authentication (JWT / session revocation).
* **Authorization**: Role-Based Access Control (RBAC) and attribute checks across user, broker, agency, and super-admin portals.
* **Secrets Management**: No secrets committed to version control; runtime environment variables and secret stores.
* **Data Protection**: Encryption at rest and in transit (TLS 1.3). PII sanitation in logs and traces.
