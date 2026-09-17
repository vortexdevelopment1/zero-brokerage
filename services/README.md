# Services

This directory contains the backend services for the Zero Brokerage platform.

The backend follows a microservices architecture in which each service is responsible for a specific business domain and owns its related business logic, API endpoints, data-access layer, and domain data.

## Responsibilities

Each service is responsible for:

- Implementing its assigned business functionality.
- Managing its own business logic.
- Managing its own database access and domain data.
- Providing and consuming documented APIs or events.
- Maintaining service-specific tests.
- Managing its own environment configuration.
- Maintaining service-specific database migrations.
- Providing health-check and monitoring endpoints where required.

## Planned Service Structure

The following structure represents the expected organization of backend services:

```text
services/
├── README.md
├── api-gateway/
├── identity-service/
├── property-service/
├── engagement-service/
├── commerce-service/
└── notification-service/
```

> The service names and boundaries are provisional and will be finalized during the architecture-design phase.

## Service Ownership

Each service must own the complete implementation of its business domain, including:

- Routes and controllers
- Business logic
- Domain-specific validation
- Repositories and data-access logic
- Database models and migrations
- Event publishers and consumers
- Service-specific tests
- Service-specific configuration

Business logic must not be placed in a centralized backend or shared business-logic package.

## Database Ownership

Each service is responsible for its own domain data and database-access layer.

Services may initially use separate PostgreSQL databases or schemas within the same PostgreSQL server. However, data ownership must remain clearly separated.

### Database Rules

- A service may directly access only its own data.
- A service must not directly access another service's database tables.
- Cross-service data access must happen through APIs or events.
- Database migrations must be managed by the service that owns the relevant data.
- Service-specific database models and repositories must remain inside that service.

## Inter-Service Communication

Services may communicate through:

- Internal REST APIs
- Synchronous service-to-service requests
- Asynchronous events
- Redis-based messaging

All inter-service communication must follow documented API or event contracts.

Relevant contracts must be maintained in the `docs/api-contracts/` directory.

## API Gateway

The API Gateway, where required, will provide a controlled entry point for the mobile applications and web portals.

Potential responsibilities include:

- Request routing
- Authentication-token verification
- Rate limiting
- Request correlation
- API versioning
- Response aggregation where necessary

The API Gateway must not contain the core business logic of individual services.

## Shared Packages

Common technical utilities may be maintained in the root `packages/` directory.

Examples include:

- Shared API and event types
- Generic validation utilities
- Configuration utilities
- Logging and observability utilities

Shared packages must not contain:

- Service-specific business logic
- Service-specific repositories
- Service-specific database models
- Direct cross-service database access
- A centralized business-logic layer

Shared code must be kept minimal to avoid unnecessary coupling between services.

## Service Development Standards

Before implementing a new service, the following details should be documented:

1. Service purpose and responsibilities
2. Service boundaries
3. Owned data and database structure
4. Public and internal APIs
5. Published and consumed events
6. Dependencies on other services
7. Authentication and authorization requirements
8. Error-handling conventions
9. Testing strategy
10. Deployment requirements
11. Health-check and monitoring requirements

Each service must contain its own `README.md` with relevant setup, configuration, API, database, testing, and deployment instructions.

## Current Status

This directory currently acts as a placeholder for the backend services of the Zero Brokerage platform.

Actual services will be added after:

- Business domains are finalized.
- Service boundaries are documented.
- Data ownership is established.
- API and event contracts are defined.
- Development and deployment conventions are agreed upon.

## Architectural Principle

> The repository may be shared through a monorepo, but business logic, service responsibilities, and domain data ownership must remain clearly separated.