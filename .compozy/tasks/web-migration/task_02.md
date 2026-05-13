---
status: pending
title: Move Backend Code into the Backend Project
type: backend
complexity: critical
dependencies:
  - task_01
---

# Task 02: Move Backend Code into the Backend Project

## Overview
Move the existing backend application code from the Electron root layout into the independent `backend/src` project. This preserves the domain, application, repository, database, parser, event, and container behavior while removing Electron runtime ownership from backend source structure.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST move backend source and tests from `src/main/**` into `backend/src/**` with imports updated to the backend-local structure.
2. MUST preserve Clean Architecture layering for domain, application, infrastructure, repositories, handlers, database, and containers.
3. MUST move SQLite migrations, seeds, Knex repositories, and database initialization into backend-owned infrastructure.
4. MUST replace Electron `userData` database ownership with backend runtime configuration for the SQLite path.
5. MUST remove direct Electron dependencies from moved backend modules except for transitional desktop-only files that are no longer part of the backend project.
6. SHOULD keep existing backend unit and integration test behavior equivalent after the move.
7. SHOULD document any intentionally deferred desktop transport files for the final retirement task.
</requirements>

## Subtasks
- [ ] 2.1 Move app infrastructure, shared backend code, database setup, migrations, and seeds into `backend/src`.
- [ ] 2.2 Move portfolio, ingestion, and tax-reporting domain/application/infra modules into `backend/src`.
- [ ] 2.3 Update backend imports, path aliases, test paths, and config references for the new project root.
- [ ] 2.4 Replace Electron-derived database path resolution with backend-owned SQLite configuration.
- [ ] 2.5 Remove or isolate Electron dialog and IPC dependencies from backend runtime modules.
- [ ] 2.6 Run and repair backend unit and integration tests after the move.
- [ ] 2.7 Keep backend coverage at or above the required threshold.

## Implementation Details
Follow the TechSpec "Project Structure and Documentation", "Data Models", "Impact Analysis", and "Development Sequencing" sections. This task moves backend behavior into `backend/src`; it does not create the Express API routes, which are handled by later tasks.

### Relevant Files
- `src/main/main.ts` - current Electron backend composition root that wires runtime, database, modules, startup, and IPC.
- `src/main/app/infra/container/types.ts` - module and dependency contracts for app, portfolio, ingestion, and tax reporting.
- `src/main/app/infra/database/database.ts` - current migration and seed initialization entry point.
- `src/main/app/infra/database/database-connection.ts` - current SQLite connection and Electron-owned database path helper.
- `src/main/portfolio/infra/container/index.ts` - current portfolio composition and IPC registration.
- `src/main/ingestion/infra/container/index.ts` - current ingestion composition, parsers, file reader, and Electron dialog usage.
- `src/main/tax-reporting/infra/container/index.ts` - current tax reporting composition and monthly/report IPC registration.
- `src/main/shared/**` - shared backend value objects, events, queue, and app errors.

### Dependent Files
- `backend/package.json` - must include backend dependencies and scripts after source is moved.
- `backend/tsconfig.json` - must resolve backend-local imports without root `src` aliases.
- `backend/jest.config.ts` - must discover moved `*.spec.ts` backend tests.
- `src/ipc/**` - current backend imports from IPC contracts must be removed from moved backend runtime paths or left outside the backend project.
- `src/preload/**` - must not be imported by backend code after the move.

### Related ADRs
- [ADR-002: Use React with an Express HTTP API](adrs/adr-002.md) - Requires reusable backend use cases behind HTTP instead of Electron IPC.
- [ADR-003: Keep Server-Side SQLite for Phase 1](adrs/adr-003.md) - Requires SQLite to remain server-side with backend configuration.
- [ADR-007: Split Backend and Frontend into Independent Projects](adrs/adr-007.md) - Requires backend code, dependencies, config, and tests under `backend/`.

## Deliverables
- Backend source and tests moved to `backend/src`.
- Backend-local imports, aliases, Jest, TypeScript, ESLint, and package scripts updated.
- SQLite configuration owned by backend runtime settings instead of Electron `userData`.
- Electron dialog and IPC dependencies removed from backend runtime modules or isolated as obsolete desktop transport.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for moved backend containers and database initialization **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Portfolio use cases such as broker creation, initial balance save/delete, and position recalculation pass from `backend/`.
  - [ ] Ingestion parsers and import use cases pass from `backend/` after path updates.
  - [ ] Tax reporting monthly and annual report use cases pass from `backend/` after path updates.
  - [ ] Database path configuration returns a backend-configured SQLite path without Electron runtime APIs.
- Integration tests:
  - [ ] Backend container integration initializes shared infrastructure, portfolio, ingestion, and tax-reporting modules from `backend/src`.
  - [ ] Database migration integration creates the expected SQLite schema using backend-local migrations.
  - [ ] Event queue startup handlers still recalculate positions and monthly tax artifacts after source relocation.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- Backend tests run from `backend/` without the root Jest project.
- `backend/src` has no dependency on renderer, preload, or Electron IPC runtime files.
- Existing fiscal behavior remains unchanged after source relocation.
