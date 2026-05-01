---
status: completed
title: Replace Single-Broker Initial Balance with Document Flows
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 7: Replace Single-Broker Initial Balance with Document Flows

## Overview

This task replaces the current single-broker initial-balance command with a document-oriented
backend flow keyed by `ticker + year`. It keeps `transactions` as the source of truth while making
save, list, and delete operations idempotent and multi-broker aware.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace the legacy single-broker initial-balance payload with a document payload containing shared fields and `allocations[]`.
- MUST add list and delete flows for initial-balance documents keyed by `ticker + year`.
- MUST treat `transactions` as the source of truth and replace all `initial_balance` transactions for the same `ticker + year` on save.
- MUST recalculate and persist the resulting position after save or delete operations.
- MUST NOT introduce a dedicated `initial_balance_documents` table in the MVP.
</requirements>

## Subtasks
- [x] 7.1 Replace the shared initial-balance contracts with document-oriented save, list, and delete shapes.
- [x] 7.2 Add or replace backend use cases for saving, listing, and deleting initial-balance documents.
- [x] 7.3 Update transaction repository behavior needed to read and replace grouped `initial_balance` transactions.
- [x] 7.4 Update portfolio IPC handlers and registrar wiring for the new document flows.
- [x] 7.5 Add repository, use-case, and IPC regression tests for multi-broker document behavior.

## Implementation Details

Implement the TechSpec sections "Initial Balance Document Flow" and "Implementation Design >
Initial balance document DTOs". Keep document reads derived from grouped `initial_balance`
transactions so recalculation remains consistent with existing year-end position logic. This task
changes backend contracts only; renderer consumption belongs to task 08.

### Relevant Files

- `src/shared/contracts/initial-balance.contract.ts` — Current single-broker command/result types to replace.
- `src/shared/ipc/contracts/portfolio/contracts.ts` — Portfolio contract definitions for save/list/delete document APIs.
- `src/main/application/repositories/transaction.repository.ts` — Read and replacement behavior for grouped `initial_balance` rows belongs here.
- `src/main/infrastructure/repositories/knex-transaction.repository.ts` — Persistence implementation for replacement and grouped document reads.
- `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.ts` — Portfolio handler surface for the new document APIs.
- `src/main/ipc/registrars/portfolio-ipc-registrar.ts` — Portfolio registrar wiring for the new contract set.
- `src/main/application/use-cases/set-initial-balance/set-initial-balance.use-case.ts` — Existing behavior to replace or retire in favor of document-oriented use cases.

### Dependent Files

- `src/shared/types/electron-api.ts` — Renderer API types must reflect the new save/list/delete initial-balance methods.
- `src/renderer/pages/initial-balance-page/use-initial-balance.ts` — Renderer state will switch to document flows in task 08.
- `src/main/application/use-cases/migrate-year/migrate-year.use-case.ts` — Year migration behavior depends on the new grouped initial-balance semantics remaining transaction-driven.

### Related ADRs

- [ADR-005: Model Editable Initial Balance as Replace-All `initial_balance` Transactions per `ticker + year`](adrs/adr-005.md) — Defines the persistence model and edit semantics for this task.

## Deliverables

- Shared initial-balance document contracts for save, list, and delete operations.
- Backend use cases and repository support for grouped multi-broker initial-balance documents.
- Portfolio IPC wiring for document-based initial-balance APIs.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for save/list/delete document behavior and recalculation **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Saving a document with multiple broker allocations replaces all prior `initial_balance` rows for the same `ticker + year`.
  - [x] Listing documents groups saved allocations back into one document per `ticker + year`.
  - [x] Deleting a document removes its grouped `initial_balance` rows and triggers recalculation.
  - [x] Saving a document with zero or negative allocation quantities fails validation.
  - [x] Saving the same `ticker + year` twice remains idempotent and does not duplicate transactions.
- Integration tests:
  - [x] Portfolio IPC save followed by list returns the same grouped multi-broker document shape.
  - [x] Portfolio IPC delete removes the document and updates the year-end position state.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Initial balance is modeled as an editable grouped document over `transactions`.
- Save, list, and delete operations are idempotent for `ticker + year`.
