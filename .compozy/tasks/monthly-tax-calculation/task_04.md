---
status: pending
title: Build the monthly tax calculator and workspace state resolver
type: backend
complexity: high
dependencies:
  - task_01
  - task_03
---

# Task 04: Build the monthly tax calculator and workspace state resolver

## Overview
Implement the core monthly close domain logic that replays transactions chronologically, groups results into
`Geral - Comum`, `Geral - Isento`, and `FII`, and derives workspace outcomes such as `closed`, `blocked`,
`needs_review`, `obsolete`, and `below_threshold`. This task converts canonical facts into persisted monthly artifacts
described by the TechSpec "Implementation Design" and ADR-003/ADR-004 decisions.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST replay supported transactions month by month in chronological order and preserve carry-forward effects into later months.
2. MUST produce fixed monthly tax groups, audit payload content, blocked reasons, disclosures, and change summaries required by the PRD.
3. MUST derive workspace state and month outcome values from the final monthly artifact instead of from renderer logic.
4. MUST block same-day opposing trades for the same ticker rather than silently classifying day trade output in V1.
</requirements>

## Subtasks
- [ ] 4.1 Create the monthly tax calculator service and artifact output shape.
- [ ] 4.2 Create the workspace state resolver and month outcome derivation rules.
- [ ] 4.3 Encode carry-forward, exemption, below-threshold, and blocked-month behavior in calculator outputs.
- [ ] 4.4 Add domain tests covering chronological replay, carry-forward propagation, blocked months, and change summaries.

## Implementation Details
Reference the TechSpec "Core Interfaces", "Data Models", and "Technical Considerations" sections. Keep month replay
and state derivation in the domain layer so application use cases only orchestrate persistence and event-driven
recalculation.

### Relevant Files
- `src/main/portfolio/application/repositories/transaction.repository.ts` — provides the transaction period data the calculator must replay.
- `src/main/portfolio/domain/services/average-price.service.ts` — existing sequential portfolio calculation logic that informs transaction-replay patterns.
- `src/main/tax-reporting/domain/historical-position.service.ts` — current tax-reporting domain service with deterministic calculation behavior.
- `src/main/tax-reporting/domain/report-generator.service.spec.ts` — useful local testing style reference for domain rule coverage.

### Dependent Files
- `src/main/tax-reporting/application/use-cases/recalculate-monthly-tax-history.use-case.ts` — later orchestration will persist calculator output month by month.
- `src/main/tax-reporting/application/use-cases/get-monthly-tax-detail.use-case.ts` — later detail reads depend on the artifact payload shape defined here.
- `src/ipc/contracts/tax-reporting/monthly-close/contracts.ts` — later IPC detail and history payloads depend on the calculator output model.

### Related ADRs
- [ADR-003: Use Fixed Monthly Tax Groups and Preserve Below-Minimum Roll-Forward](adrs/adr-003.md) — defines groups and below-threshold behavior.
- [ADR-004: Persist Monthly Close Artifacts and Recalculate Forward Automatically](adrs/adr-004.md) — requires deterministic monthly artifacts and change summaries.

## Deliverables
- Monthly calculator service that emits summary and detail artifact content for supported months.
- Workspace state resolver that maps artifact facts into renderer-ready month states and outcomes.
- Domain tests covering month grouping, carry-forward, blocked-month rules, and change summaries.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for monthly calculation behavior **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] A month with regular stock sales below the BRL 20,000 exemption cap records `Geral - Isento` output and no tax due.
  - [ ] A month with taxable FII gains records `FII` tax due and carries prior losses into the calculation.
  - [ ] A month with final payable tax below BRL 10.00 is marked `below_threshold` and carries the amount forward to the next month.
  - [ ] A month containing same-day opposing trades for the same ticker becomes blocked with a day-trade reason.
  - [ ] Recomputing a month after upstream fact changes produces a change summary when the final outcome differs.
- Integration tests:
  - [ ] Chronological replay across multiple months propagates losses, IRRF credits, and below-threshold carry-forward into later artifacts.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Supported monthly close logic is deterministic, auditable, and independent from renderer calculations.
- Workspace state and outcome values are derived in the backend and ready for persistence and IPC exposure.
