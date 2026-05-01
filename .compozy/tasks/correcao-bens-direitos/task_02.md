---
status: completed
title: Add Asset Catalog Backend APIs
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 2: Add Asset Catalog Backend APIs

## Overview

This task exposes the canonical asset catalog through typed main-process APIs so renderer flows can
list and edit ticker metadata. It adds the backend contract surface for manual catalog maintenance
without yet implementing historical repair or report-specific actions.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add typed asset catalog list and update contracts to the shared IPC registry and `ElectronApi` surface.
- MUST implement backend list and update use cases for canonical asset type, issuer name, and issuer CNPJ maintenance.
- MUST support `pendingOnly` and `reportBlockingOnly` style filtering from backend list queries.
- MUST follow the existing registrar/handler/result conventions already used by broker management.
- MUST defer legacy repair and report assembly behavior to later tasks.
</requirements>

## Subtasks
- [x] 2.1 Define shared asset catalog query, command, and result contracts.
- [x] 2.2 Add asset catalog list and update use cases in the main application layer.
- [x] 2.3 Add IPC handlers and registrar wiring for asset catalog APIs.
- [x] 2.4 Register the new asset catalog APIs in the preload and typed renderer API surface.
- [x] 2.5 Add backend and IPC regression tests for listing, filtering, and updating catalog rows.

## Implementation Details

Follow the TechSpec sections "System Architecture > Asset Catalog" and "API Endpoints". Reuse the
broker-management contract shape where it fits, but keep asset-catalog semantics centered on ticker
metadata rather than broker lifecycle. Do not include repair/reprocess commands in this task.

### Relevant Files

- `src/shared/types/electron-api.ts` — Renderer API surface that must expose the new catalog methods.
- `src/shared/ipc/contracts/ipc-contract-registry.ts` — Registry for renderer-exposed contracts.
- `src/main/application/repositories/asset.repository.ts` — Backend query and update behavior will build on this port.
- `src/main/ipc/registrars/brokers-ipc-registrar.ts` — Reference pattern for CRUD-style registrar wiring.
- `src/main/ipc/handlers/brokers/broker-ipc-handlers.ts` — Reference pattern for result-mode handler mapping.
- `src/main/infrastructure/container/index.ts` — New use cases and registrar must be registered here.

### Dependent Files

- `src/preload.ts` — Typed bridge should continue exposing all renderer-visible APIs after registry updates.
- `src/preload.test.ts` — Preload typing and invocation expectations may need updates for the new APIs.
- `src/main/ipc/handlers/ipc-handlers.integration.test.ts` — End-to-end handler coverage should include the new asset catalog channels.

### Related ADRs

- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Defines the single-source-of-truth storage model for these APIs.

## Deliverables

- Shared asset catalog contracts and renderer API typings.
- Backend list and update use cases for the canonical asset catalog.
- IPC handlers, registrar wiring, and container registration for asset catalog APIs.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for asset catalog IPC registration and behavior **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Listing asset catalog rows returns canonical type, resolution source, and nullable issuer metadata.
  - [ ] `pendingOnly` filtering returns only rows missing required report metadata or canonical type.
  - [ ] Updating a ticker changes only the supplied fields and preserves existing values for omitted fields.
  - [ ] Invalid ticker updates return a result-mode failure with a descriptive validation error.
- Integration tests:
  - [ ] Asset catalog IPC channels register successfully and appear in the shared contract registry.
  - [ ] Listing and updating catalog entries work end-to-end through the registered handlers.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- The renderer can list and update asset catalog entries through typed IPC.
- No historical repair or report-generation logic is introduced yet.
