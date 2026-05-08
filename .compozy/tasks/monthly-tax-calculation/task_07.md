---
status: completed
title: Create the monthly tax workspace and history navigation
type: frontend
complexity: medium
dependencies:
  - task_06
---

# Task 07: Create the monthly tax workspace and history navigation

## Overview
Build the top-level monthly tax workspace in the renderer and connect it to the new monthly history IPC surface. This
task adds the new app tab, the initial history listing, and the minimal navigation seam required by the TechSpec
"User Experience" and ADR-006 tab-oriented repair flow.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST add a first-class monthly tax tab to the existing tab-based app shell.
2. MUST load and display month history states from the monthly history IPC contract, including `closed`, `blocked`, `obsolete`, `needs_review`, and `below_threshold`.
3. MUST keep page composition and state-management responsibilities aligned with the repository React rules by moving orchestration into a focused hook.
4. MUST include renderer tests for loading, empty-history, and month-state rendering behavior.
</requirements>

## Subtasks
- [x] 7.1 Add the monthly tax tab and shared tab state needed by the new workspace.
- [x] 7.2 Create the monthly page, hook, and summary components for month history rendering.
- [x] 7.3 Add loading, empty-state, and error-state behavior for monthly history fetches.
- [x] 7.4 Add renderer tests for history rendering and tab navigation.

## Implementation Details
Reference the TechSpec "User Experience" and "End-to-End UI" sections. Preserve the current tabbed shell in `App.tsx`
instead of introducing router-level abstractions for MVP.

### Relevant Files
- `src/renderer/App.tsx` — current tab shell that must gain the monthly workspace entry point.
- `src/renderer/pages/ReportPage.tsx` — page-level composition root pattern for renderer flows that fetch backend data.
- `src/renderer/pages/ImportPage.tsx` — current tabbed UI pattern that monthly history must fit into.
- `src/renderer/pages/AssetsPage.test.tsx` — renderer test style reference for top-level page behavior.

### Dependent Files
- `src/ipc/renderer/electron-api.ts` — monthly page hook will consume the new API surface defined by task 06.
- `src/renderer/main.tsx` — app bootstrap remains the entry path for the new monthly page components.
- `src/renderer/styles.css` — shared styling primitives may need extension for month state cards and banners.

### Related ADRs
- [ADR-002: Choose an Audit-First History Workspace for Monthly Tax Close](adrs/adr-002.md) — makes history review the primary monthly UI.
- [ADR-006: Keep Monthly Repair Read-Only and Route Users to Existing Flows](adrs/adr-006.md) — requires tab-oriented navigation rather than route changes.

## Deliverables
- Monthly tax workspace tab integrated into the main renderer shell.
- Monthly history page, hook, and presentation components for summary states.
- Renderer tests covering tab navigation and history rendering states.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for monthly workspace loading **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Opening the monthly tab triggers the monthly history IPC call and renders the returned months.
  - [x] An empty monthly history response shows a clear no-history message instead of a blank page.
  - [x] Months with `blocked`, `needs_review`, and `below_threshold` states render distinct labels or visual treatments.
- Integration tests:
  - [x] App-level tab interaction switches from an existing page to the monthly workspace without breaking current tab rendering.
  - [x] Monthly workspace surfaces backend fetch failures using the same renderer error messaging pattern as other pages.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Users can open a dedicated monthly tax workspace and inspect their month-by-month backlog.
- History-state rendering and top-level navigation work inside the existing tabbed Electron UI.
