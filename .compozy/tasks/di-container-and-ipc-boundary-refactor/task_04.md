---
status: completed
title: "Modularize Main Container Bootstrap"
type: backend
complexity: critical
dependencies:
  - task_01
---

# Modularize Main Container Bootstrap

## Overview
This task breaks the monolithic main-process composition root into bounded-context registration modules while keeping Awilix as the DI framework. The output should be a root bootstrap factory that assembles shared infrastructure plus context-owned registrars and returns the bootstrap artifacts needed by `main.ts`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. The main bootstrap MUST move from a single global `registerDependencies` composition root to a root bootstrap factory that creates a container instance per app start.
2. Each bounded context (`app`, `portfolio`, `ingestion`, `tax-reporting`) MUST own its registration module under its infra layer for repositories, services, use cases, and IPC registrars.
3. Shared infrastructure such as database access, queue adapters, and cross-context shared services MUST be registered in one root-level shared registration helper to avoid duplication.
4. The bootstrap output MUST expose the assembled `ipcRegistry` and any other root startup artifacts required by `src/main/main.ts`, without exporting a global singleton container.
5. Bootstrap and container tests MUST prove registration completeness, registrar aggregation, and context ownership with at least 80% coverage for the changed bootstrap modules.
</requirements>

## Subtasks
- [x] 4.1 Define the root bootstrap contract and root/shared registration responsibilities in `src/main/app/infra/container`.
- [x] 4.2 Create context-owned registration modules under `src/main/app`, `src/main/portfolio`, `src/main/ingestion`, and `src/main/tax-reporting`.
- [x] 4.3 Move repository, service, use-case, handler, and registrar registrations out of the monolithic container file into the correct context registrars.
- [x] 4.4 Assemble `ipcRegistrars` and `ipcRegistry` from the modular context registrations via the new bootstrap root.
- [x] 4.5 Replace global-container-oriented bootstrap tests with tests that exercise the new per-start bootstrap factory and modular registration ownership.

## Implementation Details
Use the TechSpec "System Architecture", "Impact Analysis", and "Development Sequencing" steps 6 and 7 together with ADR-001 as the governing design. This task is about composition ownership and bootstrap shape, not about renderer import cleanup or final lint enforcement.

Keep Awilix as the DI framework baseline. The refactor should make ownership explicit by context and by shared-infra layer while preserving current singleton lifetimes where behavior depends on them. Do not keep the current monolithic index file as a thin passthrough to hidden legacy registration blocks; the structure should genuinely reflect context ownership.

### Relevant Files
- `src/main/app/infra/container/index.ts` — current monolithic composition root and the primary refactor target.
- `src/main/app/infra/container/index.test.ts` — current container smoke test that assumes a global container.
- `src/main/main.ts` — startup entrypoint that currently calls `registerDependencies` and uses the global container cradle.
- `src/main/app/infra/runtime/runtime.ts` — runtime abstraction that consumes the bootstrap output, especially `IpcRegistry`.
- `src/main/app/infra/runtime/electron-runtime.ts` — runtime implementation that registers IPC handlers from the bootstrap output.
- `src/main/app/transport/handlers/ipc-handlers.integration.test.ts` — broad integration coverage over registrar wiring that must remain valid through the composition split.
- `src/main/shared/infra/events/memory-queue.adapter.ts` — representative shared infrastructure dependency that should remain root/shared owned.

### Dependent Files
- `src/main/app/transport/registrars/app-ipc-registrar.ts` — app context registrar that should be registered by the app context module.
- `src/main/portfolio/transport/registrars/assets-ipc-registrar.ts` — portfolio registrar that should become portfolio-context-owned.
- `src/main/portfolio/transport/registrars/brokers-ipc-registrar.ts` — portfolio registrar that should become portfolio-context-owned.
- `src/main/portfolio/transport/registrars/portfolio-ipc-registrar.ts` — portfolio registrar that should become portfolio-context-owned.
- `src/main/ingestion/transport/registrars/import-ipc-registrar.ts` — ingestion registrar that should become ingestion-context-owned.
- `src/main/tax-reporting/transport/registrars/report-ipc-registrar.ts` — reporting registrar that should become reporting-context-owned.
- `src/main/portfolio/infra/handlers/recalculate-position.handler.ts` — representative handler currently registered from the monolithic root.

### Related ADRs
- [ADR-001: Keep Awilix and Split the Main Composition Root by Context](./adrs/adr-001.md) — defines the container modularization approach and removal of the global container.
- [ADR-003: Keep Application Use-Case Inputs and Outputs Inside `src/main`](./adrs/adr-003.md) — reinforces context ownership at the backend boundary.

## Deliverables
- Root bootstrap factory in `src/main/app/infra/container` that creates a container instance per app start.
- Context-owned registration modules under each bounded context infra/container area.
- Shared infrastructure registration helper for root-owned dependencies.
- Updated bootstrap/container tests that validate modular registration and `ipcRegistry` assembly.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for unchanged IPC registrar assembly and startup wiring **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Root bootstrap creates a fresh container per invocation and returns an `ipcRegistry`.
  - [x] Shared infrastructure registration exposes database, queue, and other cross-context dependencies without duplicate ownership.
  - [x] Portfolio, ingestion, app, and reporting registration modules resolve their expected use cases and registrars.
  - [x] Container tests no longer depend on a global exported singleton.
- Integration tests:
  - [x] Main startup wiring can assemble and register IPC handlers through the modular bootstrap output.
  - [x] Existing handler integration tests for app, portfolio, ingestion, and reporting continue to pass after the composition split.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `src/main/app/infra/container/index.ts` no longer acts as a monolithic global composition root.
- Each bounded context owns its registration module under its infra layer.
- Startup code can obtain `ipcRegistry` from the new bootstrap output without reading from a global container singleton.
