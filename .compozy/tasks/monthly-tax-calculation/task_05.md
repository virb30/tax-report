---
status: completed
title: Add monthly history, detail, and recalculation use cases
type: backend
complexity: high
dependencies:
  - task_01
  - task_02
  - task_04
---

# Task 05: Add monthly history, detail, and recalculation use cases

## Overview
Add the application-layer orchestration for monthly tax close: reading history, loading a single month detail, and
rebuilding artifacts from the earliest affected year forward. This task also introduces the queue-driven recalculation
handler required by ADR-004 and ADR-005 so monthly artifacts stay current after canonical fact changes.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST expose separate use cases for listing monthly history, retrieving month detail, and recalculating monthly history.
2. MUST rebuild months from the earliest affected year forward when manual or event-driven recalculation is requested.
3. MUST bootstrap monthly artifacts when history is requested before any prior calculation exists.
4. MUST subscribe to imported transactions, consolidated position imports, transaction-fee reallocations, and asset classification changes through a startup handler.
</requirements>

## Subtasks
- [x] 5.1 Create the monthly history, month detail, and recalculation use cases.
- [x] 5.2 Add the queue-driven handler that subscribes to supported upstream events.
- [x] 5.3 Implement bootstrap rebuild behavior for empty history requests.
- [x] 5.4 Add application and integration tests for manual recalculation, automatic recalculation, and history reads.

## Implementation Details
Follow the TechSpec "API Endpoints", "Development Sequencing", and "Monitoring and Observability" sections. Keep
queue subscription and artifact persistence orchestration out of IPC handlers and isolated in `tax-reporting`
application and transport layers.

### Relevant Files
- `src/main/portfolio/infra/handlers/recalculate-position.handler.ts` — startup queue-handler pattern to mirror for monthly recalculation.
- `src/main/tax-reporting/infra/container/index.ts` — tax-reporting composition root that will own the new use cases and startup handler.
- `src/main/shared/infra/events/memory-queue.adapter.ts` — event delivery behavior that monthly recalculation must integrate with.
- `src/main/main.ts` — startup path that initializes module handlers before IPC registration.

### Dependent Files
- `src/main/tax-reporting/infra/container/index.spec.ts` — module-level tests must expand to cover new use cases and startup behavior.
- `src/main/app/application/use-cases/application-contracts.integration.test.ts` — later application integration coverage may need the new monthly contracts wired through startup.
- `src/ipc/contracts/tax-reporting/monthly-close/contracts.ts` — later IPC contracts depend on the outputs exposed by these use cases.

### Related ADRs
- [ADR-004: Persist Monthly Close Artifacts and Recalculate Forward Automatically](adrs/adr-004.md) — defines forward recomputation and event-driven refresh.
- [ADR-005: Keep Monthly Close in Tax Reporting with Coarse-Grained IPC](adrs/adr-005.md) — keeps orchestration inside `tax-reporting`.

## Deliverables
- Monthly history, month detail, and recalculation use cases under `src/main/tax-reporting/application/use-cases`.
- Queue-driven monthly recalculation handler subscribed during module startup.
- Tests covering bootstrap rebuilds, forward recomputation, and supported refresh events.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for monthly recalculation orchestration **(REQUIRED)**

## Tests
- Unit tests:
  - [x] History use case triggers a bootstrap recalculation when no monthly artifacts exist yet.
  - [x] Detail use case returns the full persisted payload for a requested `YYYY-MM` month.
  - [x] Recalculation use case deletes and rebuilds months from the earliest affected year forward.
  - [x] Monthly recalculation handler reacts to the asset classification changed event with the expected start year.
- Integration tests:
  - [x] Publishing a transactions-imported event refreshes downstream monthly artifacts before the queue flow completes.
  - [x] Publishing a transaction-fees-reallocated event updates later months affected by carry-forward calculations.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Monthly artifacts can be created, refreshed, and queried through application-layer use cases.
- Supported upstream events keep persisted monthly close outputs current without manual renderer orchestration.
