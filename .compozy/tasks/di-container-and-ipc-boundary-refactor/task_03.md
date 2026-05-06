---
status: completed
title: "Clean Shared Domain Types Boundary"
type: refactor
complexity: high
dependencies:
  - task_01
  - task_02
---

# Clean Shared Domain Types Boundary

## Overview
This task dismantles `src/shared/types/domain.ts` as a mixed public/internal boundary and reassigns ownership to the correct modules. Public renderer-facing enums and DTO concepts should live in `src/ipc/contracts/**`, while backend-only and application-internal concepts should live in `src/main/**`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `src/shared/types/domain.ts` MUST stop acting as a renderer/public API dependency source for asset/report/import-related contract types.
2. Public enums and result-state concepts consumed by renderer or IPC contracts MUST be owned by `src/ipc/contracts/**` after this task.
3. Backend-only concepts such as internal transaction, source, and application-layer ownership models MUST live under `src/main/**` or other non-renderer internal modules after this task.
4. Renderer code and tests MUST no longer import process-boundary types from `src/shared/types/domain.ts`.
5. Main transport/application/domain imports affected by the ownership split MUST compile cleanly and keep focused Jest coverage at or above 80% for touched modules.
</requirements>

## Subtasks
- [x] 3.1 Audit the enums and types in `src/shared/types/domain.ts` and assign each one to either IPC public ownership or backend internal ownership.
- [x] 3.2 Move renderer-facing boundary types into `src/ipc/contracts/**` and update the contract modules that expose them publicly.
- [x] 3.3 Move backend-only type ownership into `src/main/**` where application/domain code can depend on them without leaking to renderer.
- [x] 3.4 Rewrite renderer imports so pages, hooks, components, and tests stop depending on `src/shared/types/domain.ts`.
- [x] 3.5 Remove or empty obsolete exports from `src/shared/types/domain.ts` once all approved consumers have been migrated.

## Implementation Details
Use the TechSpec "Data Models", "Impact Analysis", and "Development Sequencing" steps 4, 5, and 8 as the authoritative migration boundary. This task should not reintroduce a second public entrypoint; public types belong in the IPC module, not back in `src/shared`.

The task must keep transport/application seams clear: if a type is part of the public process boundary, it belongs in IPC contracts; if it is a backend implementation detail or use-case model, it belongs in `src/main`. Avoid solving renderer import churn with temporary re-exports from `src/shared/types/domain.ts`.

### Relevant Files
- `src/shared/types/domain.ts` — the mixed ownership file being dismantled.
- `src/preload/contracts/portfolio/portfolio/contracts.ts` — current contract module that imports asset enums from the shared boundary.
- `src/preload/contracts/ingestion/preview-import.contract.ts` — current import preview contract that exposes shared enums publicly.
- `src/preload/contracts/tax-reporting/assets-report.contract.ts` — current reporting contract using shared report/public enums.
- `src/renderer/pages/ReportPage.tsx` — renderer page importing public report-facing enums from the shared boundary.
- `src/renderer/pages/initial-balance-page/InitialBalanceForm.tsx` — renderer component importing asset type enums from the shared boundary.
- `src/renderer/pages/import-page/TransactionsPreviewTable.tsx` — renderer import UI tied to preview public types.

### Dependent Files
- `src/renderer/pages/AssetsPage.test.tsx` — renderer test currently coupling asset public types to the shared boundary.
- `src/renderer/pages/InitialBalancePage.test.tsx` — renderer test currently coupling initial-balance public types to the shared boundary.
- `src/renderer/pages/PositionsPage.test.tsx` — renderer test currently coupling positions-facing public types to the shared boundary.
- `src/main/portfolio/application/use-cases/save-initial-balance-document.use-case.ts` — currently mixes public contract input and shared domain enums.
- `src/main/ingestion/application/use-cases/import-transactions.use-case.ts` — uses shared import-related enums that may need internal relocation.
- `src/main/ingestion/application/use-cases/import-consolidated-position.use-case.ts` — uses shared asset/source enums that may need internal relocation.
- `src/main/tax-reporting/application/use-cases/generate-assets-report.use-case.ts` — returns report-facing types that need explicit ownership.

### Related ADRs
- [ADR-002: Define a Dedicated IPC Public API Module and Remove Renderer Access to Shared Domain Types](./adrs/adr-002.md) — prohibits renderer reliance on shared domain exports.
- [ADR-003: Keep Application Use-Case Inputs and Outputs Inside `src/main`](./adrs/adr-003.md) — constrains internal ownership for application-facing models.

## Deliverables
- Public boundary enums and DTO-adjacent types moved out of `src/shared/types/domain.ts`.
- Renderer code and tests updated to import public boundary types from `src/ipc/public` or `src/ipc/contracts/**` as appropriate.
- Backend-only type ownership clarified under `src/main/**` for touched concepts.
- `src/shared/types/domain.ts` removed or reduced so it no longer serves renderer/public IPC concerns.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for renderer flows and backend compilation-safe boundaries **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Asset-related renderer-facing enums remain usable from the IPC public boundary without importing `src/shared/types/domain.ts`.
  - [x] Reporting public status and pending-issue codes remain available from IPC-owned types with unchanged serialized values.
  - [x] Import preview/public resolution-state types remain stable after being moved out of the shared boundary.
  - [x] Backend internal modules that still need transaction/source semantics compile against internal ownership rather than public boundary ownership.
- Integration tests:
  - [x] Renderer page and component tests for assets, positions, initial balance, imports, and reports pass without importing `src/shared/types/domain.ts`.
  - [x] Main-side transport/application tests continue to pass after the type-ownership split.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Renderer code has no remaining imports from `src/shared/types/domain.ts`.
- Public process-boundary enums and result-state types are owned by the IPC module.
- `src/shared/types/domain.ts` no longer acts as a mixed public API and backend internal type bucket.
