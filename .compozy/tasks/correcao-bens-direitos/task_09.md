---
status: completed
title: Add Legacy Repair and Declaration-Oriented Report Backend
type: backend
complexity: critical
dependencies:
  - task_01
  - task_06
  - task_07
---

# Task 9: Add Legacy Repair and Declaration-Oriented Report Backend

## Overview

This task delivers the highest-risk backend slice: legacy asset-type repair plus the replacement of
the current broker-allocation report with an on-demand declaration-item assembler. It makes the
main process responsible for prior-year reconstruction, eligibility thresholds, pending issues,
copy readiness, and explicit ticker repair/reprocessing.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a legacy repair flow that updates canonical asset type for one ticker and reprocesses affected years on demand.
- MUST replace the current report output with one declaration item per `ticker + assetType` instead of broker-level copy rows.
- MUST compute `previousYearValue`, `currentYearValue`, `acquiredInYear`, eligibility, pending issues, and `canCopy` in the main process at request time.
- MUST keep report assembly on demand and MUST NOT persist report snapshots or unsupported issue history.
- MUST apply the supported threshold and pending rules described in the PRD and TechSpec while preserving broker context only as supporting summary data.
</requirements>

## Subtasks
- [x] 9.1 Add repair command/result contracts and backend use cases for canonical type repair and year reprocessing.
- [x] 9.2 Add services for prior-year reconstruction, declaration eligibility, and pending-issue generation.
- [x] 9.3 Replace the existing report generator and shared report output contracts with declaration-item output.
- [x] 9.4 Update report and asset IPC registrations so repair and report generation use the new backend services.
- [x] 9.5 Add characterization tests for current bugs and focused regression coverage for repair and declaration-item assembly.

## Implementation Details

Implement the TechSpec sections "Legacy Repair and Reprocessing", "Annual Report Assembly", and
"Implementation Design > Report DTO". Keep repair explicit and catalog-driven, and keep report
assembly in the main process rather than the renderer. Do not reintroduce broker-level copy rows or
persisted report status snapshots.

### Relevant Files

- `src/main/application/use-cases/generate-asset-report/generate-assets-report.use-case.ts` — Current report orchestration point to replace.
- `src/main/domain/tax-reporting/report-generator.service.ts` — Current broker-allocation report logic to retire or refactor.
- `src/main/domain/tax-reporting/report-generator.output.ts` — Existing report domain output that still assumes allocations.
- `src/main/application/use-cases/generate-asset-report/generate-asset-report.output.ts` — Shared application output contract to replace with declaration items.
- `src/shared/contracts/assets-report.contract.ts` — Renderer-facing report contract that must gain prior/current values, status, pending issues, and copy readiness.
- `src/main/application/repositories/transaction.repository.ts` — Historical reprocessing and prior-year reconstruction depend on transaction history access.
- `src/main/application/use-cases/recalculate-position/recalculate-position.use-case.ts` — Existing recalculation behavior is the authoritative way to resave corrected ticker-years.

### Dependent Files

- `src/main/ipc/registrars/report-ipc-registrar.ts` — Report registrar must expose the new declaration-item output.
- `src/main/ipc/handlers/report/report-ipc-handlers.ts` — Report handlers should return the new report payload unchanged.
- `src/shared/types/electron-api.ts` — Renderer type surface must reflect repair and declaration-oriented report APIs.

### Related ADRs

- [ADR-002: Continue with Supported Data and Surface Unsupported Lines as Pending Work](adrs/adr-002.md) — Keeps supported partial progress while blocking copy for incomplete items.
- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Repair updates the canonical catalog before reprocessing.
- [ADR-005: Model Editable Initial Balance as Replace-All `initial_balance` Transactions per `ticker + year`](adrs/adr-005.md) — Prior-year and current-year values depend on transaction-driven initial balances.
- [ADR-006: Assemble Annual Report Status On Demand and Reprocess Legacy Data Explicitly](adrs/adr-006.md) — Defines the report and repair backend design.
- [ADR-007: Keep Unsupported Import Issues Ephemeral in the MVP](adrs/adr-007.md) — Prevents a durable unsupported-issues store from leaking into report persistence.

## Deliverables

- Repair command/result contracts plus backend use cases for ticker type repair and year reprocessing.
- New declaration-item report assembler with prior/current values, eligibility, pending issues, and copy readiness.
- Updated shared report contracts and IPC wiring for report and repair flows.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for repair and declaration-oriented report generation **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Repairing a legacy ticker updates the canonical catalog type and reprocesses every affected year in ascending order.
  - [x] A ticker held across two brokers generates one declaration item with consolidated broker summary instead of two copy rows.
  - [x] Stock and BDR items at `999.99` remain below threshold while `1000.00` become required.
  - [x] FII and ETF items at `140.00` remain below threshold while values above that threshold become required.
  - [x] Missing issuer metadata produces pending issues and disables copy even when valuation data is available.
  - [x] `previousYearValue` and `currentYearValue` are derived from the correct historical cutoffs for the selected base year.
- Integration tests:
  - [x] Repair IPC updates a ticker type and returns the affected years or reprocessed-count summary expected by the renderer.
  - [x] Report IPC returns declaration items with status, pending issues, copy readiness, and both year-end values.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Legacy type repair is available through a typed backend flow and reprocesses affected years on demand.
- Annual report generation returns declaration items that are ready/pending/unsupported without broker-flattened copy rows.
