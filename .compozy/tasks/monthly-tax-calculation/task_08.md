---
status: pending
title: Implement month detail and guided repair CTAs
type: frontend
complexity: medium
dependencies:
  - task_06
  - task_07
---

# Task 08: Implement month detail and guided repair CTAs

## Overview
Complete the monthly workspace by adding month detail, fixed group breakdowns, blocked-reason messaging, and repair
CTAs that route users to existing tabs. This task turns the persisted audit payload into a trust-first renderer
experience while preserving ADR-006's read-only repair boundary.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST display month detail from the backend detail payload without recomputing tax logic in the renderer.
2. MUST present the fixed `Geral - Comum`, `Geral - Isento`, and `FII` groups plus audit facts, disclosures, and carry-forward explanations supplied by the backend.
3. MUST map repair targets to existing tabs such as import, assets, and brokers instead of adding inline repair forms.
4. MUST refresh monthly history or detail after the user returns from a repair flow so changed results become visible in the same session.
</requirements>

## Subtasks
- [ ] 8.1 Add month selection and detail loading to the monthly workspace.
- [ ] 8.2 Render grouped month outcomes, blocked reasons, disclosures, and carry-forward explanations.
- [ ] 8.3 Implement repair CTA actions that switch the app to the correct existing tab with context-preserving feedback.
- [ ] 8.4 Add renderer tests for detail rendering, blocked repairs, and post-repair refresh behavior.

## Implementation Details
Use the TechSpec "User Experience", "API Endpoints", and "End-to-End UI" sections as the reference. Keep repair CTAs
read-only and tab-oriented, with the backend detail payload driving all tax explanations and repair metadata.

### Relevant Files
- `src/renderer/App.tsx` — shared tab state must support switching to import, assets, and brokers from the monthly workspace.
- `src/renderer/pages/ImportPage.tsx` — existing destination for daily broker tax and IRRF repair flows.
- `src/renderer/pages/AssetsPage.tsx` — existing destination for asset classification repairs.
- `src/renderer/pages/BrokersPage.tsx` — existing destination for broker metadata repairs.

### Dependent Files
- `src/renderer/pages/monthly-tax-page/use-monthly-tax-page.ts` — monthly detail fetch and repair CTA orchestration should live in the page hook.
- `src/renderer/pages/monthly-tax-page/MonthlyTaxPage.test.tsx` — renderer behavior must be verified at the monthly workspace level.
- `src/ipc/public/index.ts` — detail payload types and repair-target types must remain available to renderer code and tests.

### Related ADRs
- [ADR-003: Use Fixed Monthly Tax Groups and Preserve Below-Minimum Roll-Forward](adrs/adr-003.md) — fixes the group model and carry-forward presentation.
- [ADR-006: Keep Monthly Repair Read-Only and Route Users to Existing Flows](adrs/adr-006.md) — defines the repair CTA behavior and constraints.

## Deliverables
- Month detail UI driven by the monthly detail IPC payload.
- Guided repair CTA behavior that switches to existing tabs based on backend repair targets.
- Renderer tests for grouped detail rendering, blocked reasons, and refresh after repairs.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for month detail and repair navigation **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Selecting a month loads detail and renders the `Geral - Comum`, `Geral - Isento`, and `FII` sections from the backend payload.
  - [ ] A blocked month shows human-readable blocked reasons and the correct repair CTA labels for import, assets, or brokers.
  - [ ] A month with below-threshold carry-forward shows the explanatory message returned by the backend detail payload.
- Integration tests:
  - [ ] Clicking a repair CTA switches the app to the expected destination tab and preserves enough context for the user to continue the fix.
  - [ ] Returning to the monthly workspace after a recalculation updates the changed month state or summary in the same renderer session.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Users can inspect auditable month detail and follow guided repair actions without leaving the app's existing flows.
- The renderer remains read-only for tax repair while still surfacing updated monthly outcomes after upstream corrections.
