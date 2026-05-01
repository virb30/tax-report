---
status: completed
title: Add Import Review UI for Transactions and Consolidated Positions
type: frontend
complexity: high
dependencies:
    - task_04
    - task_06
---

# Task 5: Add Import Review UI for Transactions and Consolidated Positions

## Overview

This task upgrades the renderer import flows so users can review resolved types, fill per-ticker
overrides, and see unsupported lines before confirmation. It makes the new preview and confirm
contracts usable in both the transaction page and the consolidated-position modal.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render asset-type resolution status, unresolved review controls, and unsupported summaries for both import surfaces.
- MUST collect per-ticker overrides and send them through the updated confirm commands.
- MUST disable confirmation while supported rows remain unresolved without a manual override.
- MUST distinguish unsupported rows from reviewable supported rows in both messaging and table state.
- SHOULD reuse shared status labels and override interactions between transaction import and consolidated-position import.
</requirements>

## Subtasks
- [ ] 5.1 Update transaction import state management to store preview resolution state and override selections.
- [ ] 5.2 Update the transaction preview table to render status, suggested type, and override controls.
- [ ] 5.3 Update consolidated-position modal state to track the same review fields and overrides.
- [ ] 5.4 Render unsupported summaries and confirmation guards consistently across both import surfaces.
- [ ] 5.5 Add renderer regression tests for unresolved, overridden, and unsupported import scenarios.

## Implementation Details

Implement the TechSpec sections "System Architecture > Renderer Surfaces" and
"Implementation Design > Import preview DTOs / Import confirm DTOs". Keep import pages as
composition roots, with page-local hooks owning async state and review selections. Do not move
business-rule derivation into the renderer; consume the statuses returned by the main process.

### Relevant Files

- `src/renderer/pages/ImportPage.tsx` — Composition root for transaction import.
- `src/renderer/pages/import-page/use-transaction-import.ts` — Transaction import state and confirm flow.
- `src/renderer/pages/import-page/TransactionsPreviewTable.tsx` — Current preview table that must render status and override controls.
- `src/renderer/pages/ImportConsolidatedPositionModal.tsx` — Consolidated import composition root.
- `src/renderer/pages/import-consolidated-position-modal/use-import-consolidated-position-modal.ts` — Modal state and confirm flow.
- `src/shared/types/electron-api.ts` — Updated confirm and preview method shapes must be reflected in renderer typing.

### Dependent Files

- `src/renderer/App.e2e.test.tsx` — End-to-end renderer flows should cover import review behavior.
- `src/renderer/errors/build-error-message.ts` — Existing error display should continue to format preview/confirm failures cleanly.
- `src/shared/contracts/preview-import.contract.ts` — Contract fields will drive the UI shape and test fixtures.

### Related ADRs

- [ADR-004: Use Preview-Confirm Contracts as the Import Review Boundary](adrs/adr-004.md) — Defines how review stays inside the import flow.
- [ADR-007: Keep Unsupported Import Issues Ephemeral in the MVP](adrs/adr-007.md) — Limits unsupported-line state to the import session UI.

## Deliverables

- Updated transaction import UI for resolution review and manual overrides.
- Updated consolidated-position modal with matching review semantics.
- Confirmation guards that block unresolved supported rows while allowing supported partial progress.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for renderer import review flows **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] A preview containing unresolved supported rows renders override controls for each affected ticker.
  - [ ] Confirmation stays disabled until every supported unresolved ticker has an explicit override.
  - [ ] Selecting an override updates the pending summary and includes the chosen type in the confirm request.
  - [ ] Unsupported rows render a skipped/unsupported summary without presenting override controls.
  - [ ] Consolidated-position import uses the same status labels and guard rules as transaction import.
- Integration tests:
  - [ ] Transaction import confirm sends `assetTypeOverrides` and clears preview state after a successful confirmation.
  - [ ] Consolidated-position modal confirm sends `assetTypeOverrides` and reports skipped unsupported rows correctly.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Users can review, override, and confirm supported imports without leaving the import flow.
- Unsupported lines remain visible and non-confirmable without being persisted.

