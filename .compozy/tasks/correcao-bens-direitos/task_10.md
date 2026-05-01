---
status: completed
title: Update Report UI and Expose Repair Actions
type: frontend
complexity: high
dependencies:
    - task_03
    - task_09
---

# Task 10: Update Report UI and Expose Repair Actions

## Overview

This task rewrites the renderer report experience around declaration items and connects blocked
report states to in-product repair actions. It replaces the current broker-flattened copy table
with a status-first report that surfaces prior/current values, pending issues, and copy readiness.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render the annual report as one declaration item per `ticker + assetType` with status, year-end values, pending issues, and broker summary.
- MUST remove the current broker-flattened copy-table behavior and disable copy for pending or unsupported items.
- MUST surface repair entry points from the asset catalog and report flow for items blocked by missing type or metadata.
- MUST preserve explicit supported-scope messaging in the report experience.
- SHOULD keep optional and below-threshold items visible while visually separating them from required and pending items.
</requirements>

## Subtasks
- [x] 10.1 Update report page state and rendering to consume declaration-item results.
- [x] 10.2 Replace broker-flattened rows with status-first cards, tables, or grouped rows that expose prior/current values and pending issues.
- [x] 10.3 Gate copy actions so only ready items can be copied.
- [x] 10.4 Add repair entry points from the asset catalog and blocked report items to the new backend repair flow.
- [x] 10.5 Add renderer regression tests for ready, pending, below-threshold, and unsupported report states.

## Implementation Details

Implement the TechSpec sections "System Architecture > Renderer Surfaces" and
"Implementation Design > Report DTO". Consume backend-provided statuses directly; do not recreate
eligibility or pending logic in the renderer. Keep repair entry points anchored in the asset
catalog and report screens rather than introducing a separate maintenance surface.

### Relevant Files

- `src/renderer/pages/ReportPage.tsx` — Current report UI still flattens broker allocations and must be rewritten.
- `src/renderer/pages/AssetsPage.tsx` — Asset catalog page should expose repair actions once the backend repair flow exists.
- `src/renderer/pages/assets-page/AssetCatalogTable.tsx` — Natural place for row-level repair actions tied to blocked metadata or type issues.
- `src/renderer/pages/assets-page/use-asset-catalog.ts` — Catalog page state should trigger repair and refresh flows.
- `src/shared/types/electron-api.ts` — Renderer typing must expose the repair command and new report result shape.
- `src/renderer/App.e2e.test.tsx` — End-to-end renderer coverage should verify the updated report and repair flow.

### Dependent Files

- `src/renderer/errors/build-error-message.ts` — Existing error formatting should remain the source for repair/report failures.
- `src/shared/contracts/assets-report.contract.ts` — Renderer fixtures and state shape now depend on declaration-item fields.
- `src/renderer/pages/ImportPage.tsx` — Report and repair flows should remain consistent with import-scope messaging introduced earlier.

### Related ADRs

- [ADR-002: Continue with Supported Data and Surface Unsupported Lines as Pending Work](adrs/adr-002.md) — Drives status-first rendering and copy gating.
- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Repair actions route through the canonical catalog.
- [ADR-006: Assemble Annual Report Status On Demand and Reprocess Legacy Data Explicitly](adrs/adr-006.md) — Report UI must consume on-demand declaration items.

## Deliverables

- Updated report page rendering declaration items with status, year-end values, broker summary, and pending issues.
- Copy gating and user messaging for ready, pending, below-threshold, and unsupported items.
- Repair entry points from the asset catalog and blocked report states.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for report rendering and repair interactions **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Ready declaration items render copy actions and both year-end values.
  - [ ] Pending items render pending issues and do not render enabled copy controls.
  - [ ] Below-threshold and optional items remain visible but visually distinct from required items.
  - [ ] Unsupported scope messaging remains visible without presenting declaration-ready actions.
  - [ ] Triggering a repair action calls the backend repair API and refreshes the affected catalog/report state.
- Integration tests:
  - [ ] Report generation followed by copy interaction works only for ready items.
  - [ ] Repairing a blocked ticker from the asset catalog or report refreshes the UI and updates the item status after the backend repair completes.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- The renderer annual report is declaration-item oriented and status-first.
- Users can move from blocked report state to repair action without leaving the product workflow.

