---
status: pending
title: Convert Frontend Workflows to HTTP API
type: frontend
complexity: critical
dependencies:
  - task_04
  - task_05
---

# Task 06: Convert Frontend Workflows to HTTP API

## Overview
Convert all frontend workflows from `window.electronApi` and local desktop file paths to the frontend API boundary and HTTP implementation. This includes browser-native file selection, multipart uploads, API error handling, and web-first tests for import, initial balance, positions, monthly tax, annual report, assets, and brokers.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST replace frontend `window.electronApi` calls with the frontend-owned API service boundary.
2. MUST implement a fetch-based HTTP API client for all routes exposed by the backend task.
3. MUST replace Electron file selection with browser file input behavior for transaction, daily broker tax, and consolidated position imports.
4. MUST send browser-selected files to backend multipart endpoints for preview and confirmation.
5. MUST preserve user-facing workflow outcomes for import, initial balance, positions, monthly tax, annual report, assets, and brokers.
6. MUST update frontend tests to mock the API boundary instead of Electron APIs.
7. SHOULD add browser E2E coverage for all seven parity workflows before desktop replacement.
</requirements>

## Subtasks
- [ ] 6.1 Replace `window.electronApi` usage in broker, asset, report, monthly tax, initial balance, and positions workflows.
- [ ] 6.2 Replace transaction, daily broker tax, and consolidated position imports with browser file inputs and multipart API calls.
- [ ] 6.3 Implement fetch-based API client methods and response/error parsing for every workflow route.
- [ ] 6.4 Update React tests to mock `TaxReportApi` instead of `window.electronApi`.
- [ ] 6.5 Add browser E2E scenarios covering all seven parity workflows.
- [ ] 6.6 Verify API error messages, loading states, confirmation paths, and recovery states in frontend tests.
- [ ] 6.7 Remove frontend global `electronApi` type declarations from the active browser app.

## Implementation Details
Follow the TechSpec "Core Interfaces", "Browser-Native Import Experience", "Testing Approach", and "Development Sequencing" sections. Keep frontend request/response types frontend-owned and verify compatibility through API integration tests and browser E2E tests rather than shared backend imports.

### Relevant Files
- `frontend/src/pages/import-page/use-transaction-import.ts` - current transaction import flow uses Electron file selection and file paths.
- `frontend/src/pages/import-page/use-daily-broker-taxes.ts` - current daily broker tax import flow uses Electron file selection and file paths.
- `frontend/src/pages/import-consolidated-position-modal/use-import-consolidated-position-modal.ts` - current consolidated import flow uses Electron file paths.
- `frontend/src/pages/initial-balance-page/use-initial-balance.ts` - current initial balance workflow calls `window.electronApi`.
- `frontend/src/pages/positions-page/use-positions-page.ts` - current positions workflow calls `window.electronApi`.
- `frontend/src/pages/monthly-tax-page/use-monthly-tax-page.ts` - current monthly tax workflow calls `window.electronApi`.
- `frontend/src/pages/assets-page/use-asset-catalog.ts` - current asset catalog workflow calls `window.electronApi`.
- `frontend/src/pages/brokers-page/use-broker-management.ts` - current broker workflow calls `window.electronApi`.

### Dependent Files
- `frontend/src/services/**` - API boundary and fetch implementation to create or extend.
- `frontend/src/types/**` - frontend-owned DTOs used by pages and hooks.
- `frontend/src/vite-env.d.ts` - must stop exposing active `window.electronApi` dependencies.
- `frontend/src/**/*.test.tsx` - tests must use API boundary mocks and browser file input interactions.
- `frontend/e2e/**` - browser E2E tests to create for parity workflows.
- `backend/src/http/**` - HTTP contract behavior consumed by fetch client and E2E tests.

### Related ADRs
- [ADR-002: Use React with an Express HTTP API](adrs/adr-002.md) - Requires frontend to call Express HTTP instead of IPC.
- [ADR-004: Keep Backend and Frontend Schemas Independent](adrs/adr-004.md) - Requires frontend-owned API types.
- [ADR-005: Parse Browser File Uploads in the Backend](adrs/adr-005.md) - Requires multipart upload from browser file inputs.
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](adrs/adr-006.md) - Requires browser E2E coverage for parity workflows.

## Deliverables
- All active frontend workflows use `TaxReportApi` or its fetch implementation.
- Browser-native file input and multipart upload flows for transaction, daily broker tax, and consolidated position imports.
- Frontend tests updated to mock API services instead of Electron APIs.
- Browser E2E coverage for import, initial balance, positions, monthly tax, annual report, assets, and brokers.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for frontend API client and browser workflow parity **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Broker workflow creates, updates, toggles, and lists brokers through mocked `TaxReportApi`.
  - [ ] Asset workflow lists, updates, and repairs asset type through mocked `TaxReportApi`.
  - [ ] Initial balance workflow saves, lists, edits, deletes, and refreshes positions through mocked `TaxReportApi`.
  - [ ] Positions workflow lists, recalculates, deletes, migrates, and imports consolidated positions through mocked `TaxReportApi`.
  - [ ] Monthly tax workflow lists history, loads detail, follows repair CTAs, and surfaces API failures.
  - [ ] Annual report workflow generates, groups, repairs, copies, and refreshes report items through mocked `TaxReportApi`.
  - [ ] Import workflow previews and confirms browser-selected files through mocked multipart API calls.
- Integration tests:
  - [ ] Fetch client sends expected methods, paths, JSON bodies, and multipart form data for every API method.
  - [ ] Fetch client maps HTTP error JSON into user-facing error messages without leaking sensitive details.
  - [ ] Browser E2E import flow selects a CSV/XLSX file, previews rows, confirms import, and shows recalculation output.
  - [ ] Browser E2E covers initial balance, positions, monthly tax, annual report, assets, and brokers end to end.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- No active frontend workflow calls `window.electronApi`.
- Browser file imports no longer depend on desktop local file paths.
- All seven PRD core workflows are covered by web-first tests.
