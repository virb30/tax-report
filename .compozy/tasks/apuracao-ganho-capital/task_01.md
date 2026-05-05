---
status: completed
title: Define Capital Gains Assessment Contracts and DTOs
type: backend
complexity: medium
dependencies: []
---

# Task 1: Define Capital Gains Assessment Contracts and DTOs

## Overview

Define the stable TypeScript data shapes that the capital gains backend, IPC contract, and
renderer will share. This task establishes the vocabulary for categories, statuses,
blockers, traces, monthly rows, annual totals, and source facts before any calculation or
transport code depends on them.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST define assessment DTOs that cover the TechSpec Data Models section.
- MUST include explicit ready, pending, unsupported, and mixed month statuses.
- MUST include supported stock, FII, and ETF category values.
- MUST include blocker and sale trace fields needed by the PRD Calculation Trace feature.
- SHOULD keep shared enums in `src/shared/types/domain.ts` only when renderer and backend both need them.
- MUST avoid adding persistence tables or prior-year loss fields in V1.
</requirements>

## Subtasks

- [x] 1.1 Define output DTOs for annual totals, monthly rows, category totals, blockers, and traces.
- [x] 1.2 Define source fact DTOs needed by the future query port and assessment services.
- [x] 1.3 Add shared enum values only for concepts that cross the main/renderer boundary.
- [x] 1.4 Add use case input/output files for `generate-capital-gains-assessment`.
- [x] 1.5 Add compile-time or unit coverage for DTO exports where local patterns support it.

## Implementation Details

Create the DTO and enum foundation referenced by the TechSpec "Data Models" and "Core
Interfaces" sections. Keep the shapes plain and transport-friendly so later tasks can add
query, service, IPC, and renderer behavior without redefining the contract.

### Relevant Files

- `src/shared/types/domain.ts` — Existing shared enums such as `AssetType`, `TransactionType`, and report statuses live here.
- `src/preload/contracts/tax-reporting/assets-report.contract.ts` — Current report DTO pattern for renderer-exposed tax-reporting output.
- `src/main/tax-reporting/domain/report-generator.output.ts` — Existing backend report output style.
- `src/main/tax-reporting/application/use-cases/generate-asset-report/generate-asset-report.input.ts` — Existing tax-reporting input DTO pattern.
- `src/main/tax-reporting/application/use-cases/generate-asset-report/generate-asset-report.output.ts` — Existing tax-reporting output DTO pattern.

### Dependent Files

- `src/main/tax-reporting/application/queries/capital-gains-assessment.query.ts` — Will consume source fact DTOs from this task.
- `src/main/tax-reporting/domain/capital-gains-assessment.service.ts` — Will calculate and return the DTOs from this task.
- `src/preload/contracts/tax-reporting/capital-gains-assessment.contract.ts` — Will expose the output contract over IPC.
- `src/renderer/pages/capital-gains-page/use-capital-gains-assessment.ts` — Will consume the renderer-facing DTOs.

### Related ADRs

- [ADR-001: Additive Monthly Assessment Before DARF Engine](adrs/adr-001.md) — Keeps the DTOs scoped to assessment, not DARF.
- [ADR-002: Annual Month-by-Month Assessment as V1 Product Approach](adrs/adr-002.md) — Requires monthly rows and annual totals.
- [ADR-003: Tax Reporting Read Model for Capital Gains Assessment](adrs/adr-003.md) — Requires render-ready backend output.

## Deliverables

- Capital gains input/output DTO files under the tax-reporting use case folder.
- Source fact DTOs ready for the read model query and domain services.
- Shared enum additions for cross-boundary status/category/blocker concepts.
- Unit or compile-time export tests where appropriate with 80%+ coverage **(REQUIRED)**.
- No database migrations or persistence changes.

## Tests

- Unit tests:
  - [x] DTO exports include ready, pending, unsupported, and mixed status values.
  - [x] DTO exports include stock, FII, and ETF supported category values.
  - [x] Output DTOs can represent a month with annual totals, blockers, and sale traces.
- Integration tests:
  - [x] Existing TypeScript/Jest compilation succeeds for shared DTO imports from main and preload paths.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Later backend and IPC tasks can import one consistent assessment contract shape.
- No V1 DTO introduces DARF generation, paid-tax memory, or prior-year loss entry.
