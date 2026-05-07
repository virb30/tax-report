---
status: completed
title: Extend upstream dependencies for monthly recalculation
type: backend
complexity: medium
dependencies: []
---

# Task 02: Extend upstream dependencies for monthly recalculation

## Overview
Prepare the canonical contexts that monthly close depends on so recalculation can react to upstream fact changes
without violating bounded-context ownership. This task adds missing repository reads, shared events, and container
typing needed by the TechSpec "Integration Points" and ADR-005/ADR-006 decisions.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST extend daily broker tax access with a period-based read that monthly calculation can consume.
2. MUST introduce a dedicated asset-tax-classification change event for monthly refreshes after asset repairs.
3. MUST publish the new asset classification event from the asset repair flow without making `tax-reporting` mutate canonical data.
4. MUST update shared container dependency types so `tax-reporting` can receive the required `shared`, `portfolio`, and `ingestion` seams.
</requirements>

## Subtasks
- [x] 2.1 Add a period-read method to the daily broker tax repository contract and implementation.
- [x] 2.2 Define the shared asset classification changed event used by monthly recalculation.
- [x] 2.3 Update asset repair orchestration to publish the new event with the earliest affected year.
- [x] 2.4 Expand container and module export types to make the new dependencies injectable.
- [x] 2.5 Add focused tests for the new repository read and event publication path.

## Implementation Details
Follow the TechSpec "Integration Points" and "Impact Analysis" sections. This task should only add cross-context read
and event seams; it must not embed monthly-tax logic into `portfolio` or `ingestion`.

### Relevant Files
- `src/main/ingestion/application/repositories/daily-broker-tax.repository.ts` — repository contract that currently lacks a period query.
- `src/main/ingestion/infra/repositories/knex-daily-broker-tax.repository.ts` — concrete implementation to extend with month-range reads.
- `src/main/portfolio/application/use-cases/repair-asset-type.use-case.ts` — asset repair flow that must publish the new change event.
- `src/main/app/infra/container/types.ts` — central module dependency types that must be widened for `tax-reporting`.

### Dependent Files
- `src/main/shared/domain/events/transactions-imported.event.ts` — naming and event-shape reference for the new shared event.
- `src/main/shared/application/events/queue.interface.ts` — existing publish/subscribe abstraction used by the repair flow.
- `src/main/portfolio/infra/container/index.ts` — portfolio composition will need the updated repair use case dependencies.
- `src/main/tax-reporting/infra/container/index.ts` — later monthly module wiring depends on the expanded exports and injected seams.

### Related ADRs
- [ADR-004: Persist Monthly Close Artifacts and Recalculate Forward Automatically](adrs/adr-004.md) — requires refresh on upstream fact changes.
- [ADR-005: Keep Monthly Close in Tax Reporting with Coarse-Grained IPC](adrs/adr-005.md) — keeps monthly close read-only over upstream contexts.
- [ADR-006: Keep Monthly Repair Read-Only and Route Users to Existing Flows](adrs/adr-006.md) — reinforces ownership of canonical edits.

## Deliverables
- Daily broker tax period-read support exposed through the ingestion repository seam.
- New asset classification changed event plus repair-flow publication.
- Updated app container and module dependency types for monthly feature wiring.
- Automated tests for the added repository query and repair event path.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for upstream recalculation dependencies **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Daily broker tax repository returns only rows within the requested start and end dates.
  - [x] Asset repair publishes an asset classification changed event containing the ticker and earliest affected year.
  - [x] Asset repair still returns the same response payload after queue publication is added.
- Integration tests:
  - [x] Portfolio module composes the updated asset repair use case with queue support intact.
  - [x] Container dependency types allow `tax-reporting` to receive daily broker tax access without circular imports.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Monthly close can read daily broker taxes by period through a stable repository interface.
- Asset type repairs emit a dedicated signal that future monthly recalculation handlers can subscribe to.
