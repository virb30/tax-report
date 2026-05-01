---
status: completed
title: Persist Import Overrides and Supported Rows on Confirm
type: backend
complexity: high
dependencies:
  - task_04
---

# Task 6: Persist Import Overrides and Supported Rows on Confirm

## Overview

This task upgrades import confirmation so the main process can accept manual type overrides,
persist canonical catalog updates, and save only supported rows. It completes the backend half of
the new review flow for both transaction imports and consolidated-position imports.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST extend transaction and consolidated confirm commands to accept explicit `assetTypeOverrides`.
- MUST persist accepted canonical asset type decisions into the asset catalog before saving transactions or recreated initial-balance rows.
- MUST reject confirmation when supported rows remain unresolved and no manual override is supplied.
- MUST skip unsupported rows, report skipped counts, and avoid persisting unsupported issue history.
- MUST publish recalculation only for supported rows accepted into the system.
</requirements>

## Subtasks
- [x] 6.1 Extend shared confirm command and result contracts for override payloads and skipped counts.
- [x] 6.2 Update transaction import confirmation to validate overrides, persist catalog updates, and save only supported rows.
- [x] 6.3 Update consolidated-position confirmation to validate overrides, persist catalog updates, and recreate only supported `initial_balance` rows.
- [x] 6.4 Ensure skipped unsupported rows do not enter persistence and do not trigger recalculation.
- [x] 6.5 Add backend and IPC regression tests for confirm validation, catalog persistence, and skipped counts.

## Implementation Details

Implement the TechSpec sections "Import Review Pipeline", "API Endpoints", and
"Development Sequencing > Build Order". Reuse the preview-time resolution semantics from task 04
instead of recomputing a different status vocabulary during confirmation. Keep unsupported issues
ephemeral and store only accepted supported data plus canonical catalog updates.

### Relevant Files

- `src/shared/contracts/preview-import.contract.ts` — Transaction confirm command and result types live here today.
- `src/shared/contracts/import-consolidated-position.contract.ts` — Consolidated import command and result types must gain override and skipped-count fields.
- `src/main/application/use-cases/import-transactions/import-transactions-use-case.ts` — Transaction confirmation orchestration point.
- `src/main/application/use-cases/import-consolidated-position/import-consolidated-position-use-case.ts` — Consolidated confirmation orchestration point.
- `src/main/ipc/handlers/import/import-ipc-handlers.ts` — Transaction confirm handler should forward the new command/result shape.
- `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.ts` — Consolidated confirm handler should forward the new command/result shape.
- `src/main/application/repositories/asset.repository.ts` — Confirmation now relies on persisted catalog updates before saving supported rows.

### Dependent Files

- `src/renderer/pages/import-page/use-transaction-import.ts` — Renderer confirm requests will use the new override payload.
- `src/renderer/pages/import-consolidated-position-modal/use-import-consolidated-position-modal.ts` — Consolidated renderer confirm flow depends on the new backend contract.
- `src/main/infrastructure/handlers/recalculate-position.handler.ts` — Recalculation triggers should continue to run only for accepted supported tickers and years.

### Related ADRs

- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Accepted overrides must persist into the canonical catalog.
- [ADR-004: Use Preview-Confirm Contracts as the Import Review Boundary](adrs/adr-004.md) — Confirmation receives the explicit review decisions.
- [ADR-007: Keep Unsupported Import Issues Ephemeral in the MVP](adrs/adr-007.md) — Unsupported rows are skipped but not stored as durable issues.

## Deliverables

- Updated confirm command/result contracts for transactions and consolidated imports.
- Backend confirmation logic that persists canonical type overrides before saving supported rows.
- Skipped unsupported counts and unresolved-validation behavior for both import flows.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for confirm behavior, catalog persistence, and recalculation triggers **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Confirming a supported transaction import with an override persists the canonical asset type before saving transactions.
  - [ ] Confirming with an unresolved supported ticker and no override returns a descriptive failure.
  - [ ] Unsupported transaction rows are skipped and included in the skipped-count result without being saved.
  - [ ] Consolidated import with overrides persists the catalog type before recreating supported `initial_balance` rows.
  - [ ] Recalculated tickers and years include only accepted supported rows.
- Integration tests:
  - [ ] End-to-end transaction confirm updates the catalog and imports supported rows through IPC.
  - [ ] End-to-end consolidated confirm recreates supported `initial_balance` rows and reports skipped unsupported rows.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Import confirmation persists canonical type decisions and saves only supported rows.
- Unsupported rows remain skipped and non-persistent across both import flows.
