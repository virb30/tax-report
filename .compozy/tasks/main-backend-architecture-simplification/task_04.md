---
status: pending
title: Update Renderer Portfolio Flows To Unwrap IpcResult
type: frontend
complexity: high
dependencies:
  - task_03
---

# Task 4: Update Renderer Portfolio Flows To Unwrap IpcResult

## Overview

This task updates renderer portfolio consumers so existing screens behave the same while consuming
the new `IpcResult<T>` response envelopes. It adds a small unwrapping path for portfolio calls and
updates tests and mocks to model success and failure envelopes explicitly.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST unwrap `ok: true` portfolio results before existing renderer logic reads response data.
- MUST surface `ok: false` portfolio result messages through existing user-facing error display paths.
- MUST preserve current UI behavior for positions, initial balance, migration, consolidated position import, recalculation, and delete.
- MUST update renderer mocks to return `IpcResult<T>` for portfolio APIs.
- MUST not change report, broker, app, or transaction import renderer APIs unless required by shared test setup.
</requirements>

## Subtasks

- [ ] 4.1 Add or update renderer result unwrapping for portfolio IPC responses.
- [ ] 4.2 Update positions page hook behavior for list, recalculate, and delete responses.
- [ ] 4.3 Update initial balance flow for list and save responses.
- [ ] 4.4 Update migration and consolidated-position import flows for result envelopes.
- [ ] 4.5 Update renderer tests and Electron API mocks for portfolio result success and failure.
- [ ] 4.6 Verify non-portfolio renderer calls keep their current response shapes.

## Implementation Details

Keep the renderer changes focused on portfolio calls. Existing UI code uses `buildErrorMessage`
for thrown errors; result failures should become displayable through the same user-facing paths
without leaking backend details. Use the TechSpec "API Endpoints" and "Testing Approach" sections
for the required behavior.

### Relevant Files

- `src/renderer/pages/positions-page/use-positions-page.ts` — consumes list, recalculate, and delete portfolio APIs.
- `src/renderer/pages/initial-balance-page/use-initial-balance.ts` — consumes list and set initial balance APIs.
- `src/renderer/pages/import-consolidated-position-modal/use-import-consolidated-position-modal.ts` — consumes consolidated position preview/import APIs.
- `src/renderer/components/MigrateYearModal.tsx` — consumes migrate year API.
- `src/renderer/errors/build-error-message.ts` — existing user-facing error-message helper.
- `src/shared/types/electron-api.ts` — renderer-facing API return types.

### Dependent Files

- `src/renderer/pages/PositionsPage.test.tsx` — positions page list, recalculation, and delete expectations.
- `src/renderer/pages/InitialBalancePage.test.tsx` — initial balance load and submit expectations.
- `src/renderer/pages/ImportConsolidatedPositionModal.test.tsx` — consolidated import preview/import expectations.
- `src/renderer/App.e2e.test.tsx` — app-level mocks for portfolio APIs.
- `src/preload-bridge/build-electron-api.test.ts` — should remain compatible with raw result forwarding.

### Related ADRs

- [ADR-003: Migrate Portfolio IPC to IpcResult](adrs/adr-003.md) — Requires renderer consumption of portfolio result envelopes.
- [ADR-004: Defer Portfolio Corrections To Phase 2](adrs/adr-004.md) — Confirms no correction UI should be added.

## Deliverables

- Renderer portfolio call sites unwrap `IpcResult<T>` consistently.
- Existing portfolio workflows display result failures through current error UI.
- Renderer mocks and tests updated for portfolio result envelopes.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for current portfolio screen flows **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Positions page loads positions from an `ok: true` list result.
  - [ ] Positions page displays an `ok: false` list failure message.
  - [ ] Recalculate and delete actions reload positions after `ok: true` responses.
  - [ ] Initial balance page reads positions from an `ok: true` list result.
  - [ ] Initial balance submit displays an `ok: false` save failure message.
  - [ ] Consolidated position modal renders preview data from an `ok: true` preview result.
  - [ ] Migration modal displays an `ok: false` migration failure message.
- Integration tests:
  - [ ] App-level renderer test still completes the current initial balance and annual report flow with result-wrapped portfolio mocks.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Current renderer portfolio behavior is preserved while consuming `IpcResult<T>`.
- No portfolio correction UI, copy, or API call is introduced.
