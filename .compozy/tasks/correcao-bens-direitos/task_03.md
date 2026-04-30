---
status: completed
title: Build Asset Catalog Management UI
type: frontend
complexity: high
dependencies:
    - task_02
---

# Task 3: Build Asset Catalog Management UI

## Overview

This task adds the renderer surface for manual asset catalog maintenance. It gives users a page to
inspect canonical type and issuer metadata, filter incomplete rows, and edit entries without
touching repair or report-generation behavior yet.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a dedicated asset catalog page and tab to the existing renderer navigation.
- MUST keep the page as a composition root and place async loading, filters, modal state, and submit behavior in a focused page hook.
- MUST support listing, pending/report-blocking filters, and edit flows for canonical asset type and issuer metadata.
- MUST reuse the existing renderer error and feedback patterns used by broker management.
- MUST defer legacy repair actions and report-page entry points to a later task.
</requirements>

## Subtasks
- [ ] 3.1 Add the asset catalog tab and page shell to the main renderer navigation.
- [ ] 3.2 Create a page hook for loading catalog rows, applying filters, and managing edit state.
- [ ] 3.3 Create table and modal/form components for browsing and editing ticker metadata.
- [ ] 3.4 Add renderer service helpers for the new asset catalog APIs.
- [ ] 3.5 Add renderer regression tests covering list, filter, and edit flows.

## Implementation Details

Implement the TechSpec sections "System Architecture > Renderer Surfaces" and
"Development Sequencing > Build Order" for the catalog UI slice. Mirror the broker page structure:
page component, page-local hook, table component, and edit modal. Keep repair actions out of scope
so this task stays independently shippable after the backend API work lands.

### Relevant Files

- `src/renderer/App.tsx` — Main tab navigation where the new asset catalog page must be wired in.
- `src/renderer/pages/BrokersPage.tsx` — Reference composition-root pattern for management pages.
- `src/renderer/pages/brokers-page/use-broker-management.ts` — Reference hook pattern for load/edit/toggle state.
- `src/renderer/services/api/list-brokers.ts` — Reference renderer service style for typed IPC-backed data access.
- `src/shared/types/electron-api.ts` — The new page relies on the asset catalog methods added in task 02.

### Dependent Files

- `src/renderer/App.e2e.test.tsx` — Navigation coverage should include the new asset catalog tab.
- `src/renderer/types/broker.types.ts` — Reference model pattern for any new renderer asset catalog types.
- `src/renderer/errors/build-error-message.ts` — Existing user-facing error formatting should remain consistent.

### Related ADRs

- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Defines the metadata this UI is allowed to edit.

## Deliverables

- New asset catalog page, hook, and supporting components in the renderer.
- Renderer service helpers for list and update catalog operations.
- Navigation updates exposing the asset catalog to users.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for renderer list/filter/edit behavior **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Opening the asset catalog tab loads catalog items through the page hook.
  - [ ] Enabling a pending/report-blocking filter reduces the visible rows to incomplete entries only.
  - [ ] Editing a ticker updates canonical asset type and issuer metadata, then refreshes the table.
  - [ ] Backend update failures show the existing renderer error banner instead of silently failing.
- Integration tests:
  - [ ] The new navigation tab renders the asset catalog page without breaking existing tabs.
  - [ ] The edit modal opens with the selected ticker values and closes after a successful save.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Users can browse and edit asset catalog entries from the renderer.
- The page exposes incomplete metadata filters without introducing repair-side effects.

