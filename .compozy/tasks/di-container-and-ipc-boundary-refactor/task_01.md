---
status: completed
title: "Adjust Public IPC Contracts"
type: refactor
complexity: critical
dependencies: []
---

# Adjust Public IPC Contracts

## Overview
This task moves the public process-boundary contracts out of `src/preload/contracts/**` and into a dedicated `src/ipc/contracts/**` module, following the TechSpec and ADR-002. It also establishes public DTO ownership inside the IPC layer so renderer-facing schemas and results stop depending on mixed shared-domain exports.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. Public IPC contracts for `app`, `portfolio`, `ingestion`, and `tax-reporting` MUST be relocated under `src/ipc/contracts/**` while preserving existing channel names, API method names, validation semantics, and error behavior.
2. Public renderer-facing DTOs and enums MUST be owned by the IPC module instead of importing renderer boundary types from `src/shared/types/domain.ts`.
3. Main transport, preload/runtime-adjacent code, and tests that consume contracts MUST be updated to the new import locations without introducing compatibility aliases in `src/preload/contracts/**`.
4. Contract registry coverage MUST still prove channel uniqueness, renderer exposure metadata correctness, and API-name uniqueness after the move.
5. All changed or added contract tests MUST keep at least 80% coverage for the affected contract modules and pass in Jest.
</requirements>

## Subtasks
- [x] 1.1 Move the public contract definitions and grouped contract exports from `src/preload/contracts/**` into `src/ipc/contracts/**` by bounded context.
- [x] 1.2 Rehome renderer-facing DTO enums and result payload types so the IPC module owns the public contract surface.
- [x] 1.3 Update contract consumers in main-side registrars, handlers, preload tests, and contract tests to the new paths.
- [x] 1.4 Preserve all public channel IDs and renderer API names while removing legacy contract ownership from `src/preload/contracts/**`.
- [x] 1.5 Verify contract registry and payload validation behavior through focused regression tests.

## Implementation Details
This task is driven by the TechSpec sections "System Architecture", "Data Models", and "Development Sequencing" steps 1 and 2. Keep the migration as a direct cut: no parallel legacy export surface should remain under `src/preload/contracts/**` once the new IPC contract ownership is in place.

Because there is no `_prd.md` for this feature, derive scope from the TechSpec public API resources and the ADR requirement that IPC contracts become a dedicated public module. Do not move the Electron bridge runtime in this task; keep the scope centered on contract ownership, schemas, DTOs, and their immediate tests/importers.

### Relevant Files
- `src/preload/contracts/app/contracts.ts` — current app contract definitions that must move into the new IPC contract tree.
- `src/preload/contracts/portfolio/portfolio/contracts.ts` — representative portfolio contract module with schema and enum coupling to `src/shared/types/domain.ts`.
- `src/preload/contracts/ingestion/import/contracts.ts` — grouped ingestion contract exports that define the public import boundary.
- `src/preload/contracts/tax-reporting/report/contracts.ts` — grouped reporting contract exports for renderer-facing reporting flows.
- `src/preload/ipc/ipc-contract-registry.ts` — current registry aggregation point that depends on the contract module layout.
- `src/preload/ipc/ipc-contract-registry.test.ts` — regression tests for uniqueness and renderer exposure metadata.
- `src/preload/preload.test.ts` — asserts the exposed contract surface and channel registration assumptions.

### Dependent Files
- `src/main/app/transport/registrars/app-ipc-registrar.ts` — imports app contracts and will need the new contract paths.
- `src/main/portfolio/transport/registrars/assets-ipc-registrar.ts` — imports asset contracts and is part of the direct-cut update.
- `src/main/portfolio/transport/registrars/brokers-ipc-registrar.ts` — imports broker contracts and participates in the contract relocation.
- `src/main/portfolio/transport/registrars/portfolio-ipc-registrar.ts` — imports the grouped portfolio contract set that will move.
- `src/main/ingestion/transport/registrars/import-ipc-registrar.ts` — consumes grouped ingestion contracts and must track the new public boundary.
- `src/main/tax-reporting/transport/registrars/report-ipc-registrar.ts` — consumes reporting contracts and must follow the new IPC module paths.
- `src/main/app/transport/handlers/ipc-handlers.integration.test.ts` — integration coverage currently imports public contracts directly from `src/preload/contracts/**`.

### Related ADRs
- [ADR-002: Define a Dedicated IPC Public API Module and Remove Renderer Access to Shared Domain Types](./adrs/adr-002.md) — establishes `src/ipc` as the public process boundary.
- [ADR-003: Keep Application Use-Case Inputs and Outputs Inside `src/main`](./adrs/adr-003.md) — constrains this task to public DTO ownership only, not application DTO ownership.

## Deliverables
- Public IPC contract modules relocated into `src/ipc/contracts/**` with preserved channel names and renderer API metadata.
- Updated grouped exports and registry inputs for all bounded contexts that expose IPC contracts.
- Removal of legacy contract ownership from `src/preload/contracts/**` without leaving compatibility aliases behind.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for contract registry compatibility and unchanged channel exposure **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Contract registry still rejects duplicate renderer API names after the contract move.
  - [x] Contract registry still rejects duplicate IPC channels after the contract move.
  - [x] Portfolio contract schemas still validate `saveInitialBalanceDocument`, `listPositions`, and `recalculatePosition` payloads with the same channel names.
  - [x] Ingestion contract schemas still validate preview/import payloads and preserve current result/error modes.
  - [x] Reporting and app contract exports still expose the same public contract IDs and channel strings.
- Integration tests:
  - [x] Preload contract exposure test still proves every renderer-exposed contract channel is registered.
  - [x] Main integration tests can import moved contracts and still bind the same channel names for app, portfolio, ingestion, and reporting flows.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No public IPC contract is owned by `src/preload/contracts/**` anymore.
- Channel names, API method names, and payload semantics remain unchanged for all existing renderer-facing flows.
- Main-side registrars and integration tests compile against `src/ipc/contracts/**` without compatibility shims.
