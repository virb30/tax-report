---
status: completed
title: Add Dedicated Renda Variavel Assessment Page
type: frontend
complexity: high
dependencies:
  - task_06
---

# Task 7: Add Dedicated Renda Variavel Assessment Page

## Overview

Add the dedicated renderer page and navigation entry for the Renda Variavel capital gains
assessment workflow. The page should let users select a tax year, generate the assessment,
scan annual totals and monthly statuses, and expand rows to review blockers and sale
traces.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a separate page/tab for Renda Variavel assessment, not extend Bens e Direitos `ReportPage`.
- MUST call `window.electronApi.generateCapitalGainsAssessment({ baseYear })`.
- MUST show annual totals derived from backend monthly rows.
- MUST show month-by-month rows with ready, pending, unsupported, and mixed statuses.
- MUST keep blockers visible and prevent copy/reliance affordances when months are not ready.
- MUST expose sale trace details behind expansion controls.
- SHOULD use existing year option and error-message helpers.
- MUST keep tax rules out of renderer code.
</requirements>

## Subtasks

- [x] 7.1 Add a `CapitalGainsPage` and dedicated hook for loading assessment data.
- [x] 7.2 Add the Renda Variavel tab to app navigation without changing existing tabs.
- [x] 7.3 Render annual totals and month-by-month status rows.
- [x] 7.4 Render blockers for pending, unsupported, and mixed months.
- [x] 7.5 Add expandable sale trace details for reviewed months.
- [x] 7.6 Add tests for loading, status rendering, blockers, trace expansion, and error handling.

## Implementation Details

Follow the TechSpec "Component Overview" and "User Experience" guidance. The renderer
should display backend DTOs and handle UI state only; it should not recalculate tax
classification, exemptions, or loss compensation.

### Relevant Files

- `src/renderer/App.tsx` — Existing tab navigation.
- `src/renderer/pages/ReportPage.tsx` — Existing report page layout and API call style.
- `src/renderer/pages/ReportPage.test.tsx` — Existing report page test style.
- `src/renderer/pages/positions-page/use-positions-page.ts` — Existing page hook pattern with year state and loading behavior.
- `src/renderer/errors/build-error-message.ts` — Existing renderer error formatting helper.
- `src/shared/utils/year.ts` — Existing tax-year option helpers.
- `src/preload/renderer/electron-api.ts` — Renderer API type updated by task 06.

### Dependent Files

- `src/renderer/App.e2e.test.tsx` — May need updates if navigation expectations enumerate tabs.
- `src/renderer/vite-env.d.ts` — May depend on the updated Electron API typing if global declarations reference it.
- `src/renderer/styles.css` — May be affected only if existing utility classes are insufficient.

### Related ADRs

- [ADR-002: Annual Month-by-Month Assessment as V1 Product Approach](adrs/adr-002.md) — Requires monthly rows as the main UX.
- [ADR-003: Tax Reporting Read Model for Capital Gains Assessment](adrs/adr-003.md) — Requires renderer display of backend render-ready DTOs.

## Deliverables

- Dedicated Renda Variavel assessment page and hook.
- App navigation entry for the new workflow.
- Monthly table, annual summary, blocker display, and trace expansion UI.
- Renderer tests with 80%+ coverage **(REQUIRED)**.
- No renderer-side tax calculation logic.

## Tests

- Unit tests:
  - [ ] Selecting a tax year calls `generateCapitalGainsAssessment` with that `baseYear`.
  - [ ] Ready, pending, unsupported, and mixed month statuses render distinctly.
  - [ ] Annual totals render from backend output values.
  - [ ] Pending and unsupported blockers render in their month rows.
  - [ ] Expanding a month shows source transaction, fees, cost basis, classification, and compensation trace fields.
  - [ ] Non-ready months do not show enabled copy/reliance affordances.
  - [ ] IPC errors render with `buildErrorMessage`.
- Integration tests:
  - [ ] App navigation can switch to the Renda Variavel page without breaking existing tabs.
  - [ ] The page renders an empty selected-year assessment without crashing.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Users can select a tax year and review annual totals plus monthly assessment rows.
- Users can identify blockers and inspect traces without using the Bens e Direitos report page.
