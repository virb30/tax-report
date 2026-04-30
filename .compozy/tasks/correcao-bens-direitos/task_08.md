---
status: completed
title: Rebuild Initial Balance Page for Multi-Broker Documents
type: frontend
complexity: high
dependencies:
  - task_07
---

# Task 8: Rebuild Initial Balance Page for Multi-Broker Documents

## Overview

This task updates the initial-balance renderer flow to manage grouped multi-broker documents
instead of one-off single-broker entries. It gives users the UI needed to create, edit, replace,
and delete yearly initial balances while keeping the positions view clearly separated.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST support multiple broker allocations per `ticker + year` in the initial-balance editor.
- MUST load and render saved initial-balance documents separately from the year-end positions table.
- MUST allow editing and deleting saved documents using the new backend APIs only.
- MUST keep async state, validation, and modal/edit behavior in a focused page hook rather than the page component.
- SHOULD preserve the existing feedback, error, and year-selection patterns used by the current initial-balance page.
</requirements>

## Subtasks
- [x] 8.1 Update the page hook to load initial-balance documents and manage a multi-allocation editor state.
- [x] 8.2 Replace the single-broker form inputs with allocation rows that can be added, edited, and removed.
- [x] 8.3 Add a saved-documents table with edit and delete actions for each `ticker + year` document.
- [x] 8.4 Keep the existing positions table visible but clearly separated from document management.
- [x] 8.5 Add renderer regression tests for save, edit, replace, and delete flows.

## Implementation Details

Implement the TechSpec sections "System Architecture > Renderer Surfaces" and
"Implementation Design > Initial balance document DTOs". Keep the page itself as a composition
root and use named child components for the document editor and saved-documents table. Do not
collapse year-end positions and initial-balance documents into one ambiguous table.

### Relevant Files

- `src/renderer/pages/InitialBalancePage.tsx` — Composition root that should stay thin after the rewrite.
- `src/renderer/pages/initial-balance-page/use-initial-balance.ts` — Current single-broker state and save flow to replace.
- `src/renderer/pages/initial-balance-page/InitialBalanceForm.tsx` — Current form that assumes one broker allocation.
- `src/renderer/pages/initial-balance-page/InitialBalancePositionsTable.tsx` — Existing position display that should remain separated from documents.
- `src/shared/types/electron-api.ts` — Updated initial-balance document APIs must be reflected in renderer typing.
- `src/renderer/services/api/list-brokers.ts` — Broker options remain a shared dependency for allocation editing.

### Dependent Files

- `src/renderer/pages/InitialBalancePage.test.tsx` — Existing tests should be expanded to cover grouped document behavior.
- `src/renderer/App.e2e.test.tsx` — End-to-end flow should cover saving and replacing a multi-broker initial balance document.
- `src/renderer/errors/build-error-message.ts` — Existing error formatting should continue to power form and delete failures.

### Related ADRs

- [ADR-005: Model Editable Initial Balance as Replace-All `initial_balance` Transactions per `ticker + year`](adrs/adr-005.md) — Defines the document semantics the UI must follow.

## Deliverables

- Updated initial-balance page hook, editor components, and saved-document table.
- Renderer support for save, edit, replace, and delete document flows.
- Clear separation between document management and year-end positions display.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for renderer initial-balance document behavior **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Adding multiple broker allocations produces the expected save payload for one `ticker + year` document.
  - [x] Editing an existing document preloads its allocations and replaces the saved document on resubmit.
  - [x] Deleting a saved document removes it from the document table after a successful backend response.
  - [x] Validation rejects attempts to save when any allocation is missing broker or quantity.
  - [x] The positions table remains visible and distinct from the saved-documents table after the rewrite.
- Integration tests:
  - [x] Saving a multi-broker document refreshes the saved-documents table and clears the editor state.
  - [x] Replacing the same `ticker + year` document updates the rendered allocations without duplicating rows.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Users can manage multi-broker initial-balance documents entirely from the renderer.
- The page no longer assumes one broker allocation per save.
