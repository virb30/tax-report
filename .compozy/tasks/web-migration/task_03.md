---
status: pending
title: Add Express Server Core and Backend Runtime
type: backend
complexity: high
dependencies:
  - task_02
---

# Task 03: Add Express Server Core and Backend Runtime

## Overview
Add the backend web runtime around the moved use cases and repositories. This task creates the Express app, backend startup path, route registration foundation, runtime configuration, consistent error response shape, safe logging, and health endpoint.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST add an Express application composition root that initializes SQLite, shared infrastructure, modules, startup handlers, and HTTP route registration.
2. MUST expose `GET /api/health` returning a successful health payload.
3. MUST define consistent JSON error responses with `error.code`, `error.message`, and optional `error.details`.
4. MUST validate HTTP input in transport code before invoking application use cases.
5. MUST log backend request failures with route, method, status, error code, and correlation ID while avoiding sensitive financial data.
6. SHOULD support testing the Express app without binding a network listener.
</requirements>

## Subtasks
- [ ] 3.1 Add backend HTTP app creation and route registration primitives.
- [ ] 3.2 Add backend startup entrypoint and runtime configuration loading.
- [ ] 3.3 Add health route and request correlation support.
- [ ] 3.4 Add common HTTP error mapping and JSON response helpers.
- [ ] 3.5 Add safe backend failure logging that redacts sensitive data.
- [ ] 3.6 Add tests for app creation, health response, config validation, and error shape.

## Implementation Details
Follow the TechSpec "Core Interfaces", "API Endpoints", "Monitoring and Observability", and "Technical Considerations" sections. Keep route handlers thin and transport-owned; application use cases must remain Express-free.

### Relevant Files
- `backend/src/app/infra/container/types.ts` - moved module dependency contracts for composition.
- `backend/src/app/infra/database/database.ts` - database initialization needed by the web runtime.
- `backend/src/app/infra/container/shared-infrastructure.ts` - shared Knex, queue, and allocator composition.
- `backend/src/portfolio/infra/container/index.ts` - portfolio module used by backend runtime composition.
- `backend/src/ingestion/infra/container/index.ts` - ingestion module used by backend runtime composition.
- `backend/src/tax-reporting/infra/container/index.ts` - tax-reporting module used by backend runtime composition.

### Dependent Files
- `backend/package.json` - must include Express and runtime scripts.
- `backend/src/main.ts` - backend server startup entrypoint to create.
- `backend/src/http/**` - transport, handlers, middleware, and route registration modules to create.
- `backend/src/app/infra/runtime/**` - backend runtime config replaces Electron runtime ownership.
- `backend/jest.config.ts` - must support Express integration tests.

### Related ADRs
- [ADR-002: Use React with an Express HTTP API](adrs/adr-002.md) - Selects Express HTTP API as the backend transport.
- [ADR-003: Keep Server-Side SQLite for Phase 1](adrs/adr-003.md) - Requires server-side SQLite runtime configuration.
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](adrs/adr-006.md) - Requires API integration coverage.

## Deliverables
- Express app factory and server startup entrypoint.
- Backend runtime configuration for port, SQLite path, upload limits, and environment.
- Health route and common route registration mechanism.
- Consistent HTTP error mapper and safe logging middleware.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for Express app startup and health/error behavior **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Runtime config accepts a valid SQLite path and rejects a missing required database path.
  - [ ] HTTP error mapper converts validation errors to a JSON body with `error.code` and `error.message`.
  - [ ] HTTP error mapper includes `error.details` only when safe structured details exist.
  - [ ] Logger redacts uploaded file content, CNPJ values, and tax row details from error metadata.
- Integration tests:
  - [ ] `GET /api/health` returns a successful JSON response from the Express app without a network listener.
  - [ ] Unknown route returns a consistent JSON error body.
  - [ ] Backend app creation initializes database and module startup handlers once.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- Express app can be created in tests without starting a port.
- Backend startup no longer depends on Electron runtime APIs.
- Error responses and failure logs follow the TechSpec web API shape.
