---
status: completed
title: Implement Average Cost and Corporate Action Assessment Rules
type: backend
complexity: high
dependencies:
    - task_01
---

# Task 3: Implement Average Cost and Corporate Action Assessment Rules

## Overview

Implement the domain service that turns ordered source facts into sale-level realized
results and trace data. This task covers average cost continuity across buys, sells,
initial balances, supported corporate actions, transfers, fraction auctions, and blockers
for ambiguous or unsupported operation patterns.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST calculate acquisition cost basis and sale result traces for supported source facts.
- MUST support buys, sells, initial balances, bonus events, splits, reverse splits, transfers, and fraction auctions.
- MUST detect day trade patterns and surface blockers instead of calculating them as ready ordinary operations.
- MUST mark ambiguous cost-basis situations as pending or mixed blockers.
- MUST keep calculation logic in backend domain code, not renderer code.
- SHOULD use existing `Money` and `Quantity` value object behavior where it improves precision and consistency.
</requirements>

## Subtasks

- [ ] 3.1 Add a capital gains assessment domain service for sale-level assessment.
- [ ] 3.2 Calculate average cost effects for buys, sells, and initial balances.
- [ ] 3.3 Calculate quantity and average cost effects for supported corporate actions.
- [ ] 3.4 Detect day trade and unsupported/ambiguous cases as blockers.
- [ ] 3.5 Produce sale-level trace DTOs with source transaction, fees, cost basis, and average cost effects.
- [ ] 3.6 Add fixture-heavy unit tests for each supported transaction type and blocker case.

## Implementation Details

Follow the TechSpec "Testing Approach" and "Technical Considerations" sections. Keep this
task focused on cost basis and sale traces; monthly tax classification and loss
compensation belong to task 04.

### Relevant Files

- `src/main/tax-reporting/domain/report-position-projection.service.ts` — Existing corporate-action projection logic for annual holdings.
- `src/main/tax-reporting/domain/report-position-projection.service.spec.ts` — Existing tests for projection behavior.
- `src/main/portfolio/domain/services/position-calculator.service.ts` — Existing position calculation behavior.
- `src/main/portfolio/domain/services/average-price.service.ts` — Existing average price rules.
- `src/main/portfolio/domain/value-objects/money.vo.ts` — Money precision and formatting behavior.
- `src/main/portfolio/domain/value-objects/quantity.vo.ts` — Quantity precision and arithmetic behavior.
- `src/shared/types/domain.ts` — Existing `TransactionType` and `AssetType` enums.

### Dependent Files

- `src/main/tax-reporting/domain/capital-gains-loss-compensation.service.ts` — Will classify and compensate sale results from this service.
- `src/main/tax-reporting/application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.use-case.ts` — Will invoke this through task 04 composition.
- `src/preload/contracts/tax-reporting/capital-gains-assessment.contract.ts` — Will expose traces produced by this service.

### Related ADRs

- [ADR-001: Additive Monthly Assessment Before DARF Engine](adrs/adr-001.md) — Requires assessment without DARF expansion.
- [ADR-004: Current-Year Assessment With Corporate Action Support](adrs/adr-004.md) — Requires corporate-action support and ambiguity blockers.

## Deliverables

- `CapitalGainsAssessmentService` domain service.
- Sale-level trace results for supported ordinary operations.
- Blocker output for day trade, unsupported assets, missing asset type, and ambiguous cost basis.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- No renderer or IPC changes in this task.

## Tests

- Unit tests:
  - [ ] Initial balance followed by a sale produces the expected acquisition cost basis.
  - [ ] Buy transactions update average cost before a later sale.
  - [ ] Sell transactions reduce quantity and produce sale proceeds, fees considered, gross result, and cost basis trace fields.
  - [ ] Bonus transactions adjust quantity and average cost before a later sale.
  - [ ] Split and reverse split transactions adjust quantity and average cost without changing total cost.
  - [ ] Transfer events preserve or block cost basis according to available source data.
  - [ ] Fraction auction events produce traceable sale behavior for fractional quantities.
  - [ ] Same-day buy and sell for the same ticker emits a day trade blocker.
  - [ ] Missing asset type emits a pending blocker rather than a ready result.
- Integration tests:
  - [ ] Domain service consumes query source fact DTOs from task 01 without adapter-specific fields.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Sale-level traces contain every trace field required by the PRD Calculation Trace feature.
- Ambiguous or unsupported operation patterns cannot be emitted as fully ready results.
