---
status: completed
title: Implement Monthly Classification and Loss Compensation
type: backend
complexity: high
dependencies:
  - task_01
  - task_03
---

# Task 4: Implement Monthly Classification and Loss Compensation

## Overview

Implement the monthly assessment layer that classifies sale results into ready, pending,
unsupported, or mixed rows and applies same-category current-year loss compensation. This
task turns sale traces from task 03 into annual month-by-month Renda Variavel evidence.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST classify every assessed month with ready, pending, unsupported, or mixed status.
- MUST apply the R$ 20,000 ordinary stock monthly sale threshold only to eligible stock gains.
- MUST never apply stock exemption treatment to FII or ETF results.
- MUST compensate losses only within the same supported category and only inside the selected year.
- MUST start V1 selected-year loss balances at zero.
- MUST derive annual totals from monthly rows, not from a separate annual calculation.
- MUST keep blockers visible when supported and unsupported results coexist.
</requirements>

## Subtasks

- [x] 4.1 Add monthly grouping for sale traces and blockers.
- [x] 4.2 Add stock exemption classification for monthly stock sales up to and including R$ 20,000.
- [x] 4.3 Add category-specific taxable, exempt, loss, compensated, and remaining loss totals.
- [x] 4.4 Add same-category current-year loss carryforward across months.
- [x] 4.5 Add mixed, pending, unsupported, and ready status selection rules.
- [x] 4.6 Add annual total aggregation from monthly rows.
- [x] 4.7 Add tests for threshold, category separation, loss carryforward, and blockers.

## Implementation Details

Use the TechSpec "Technical Considerations" section for key decisions and avoid adding
prior-year loss persistence. This task may extend the task 03 assessment service or add a
separate `CapitalGainsLossCompensationService` as described by the TechSpec.

### Relevant Files

- `src/main/tax-reporting/domain/declaration-eligibility.service.ts` — Existing status-oriented report decision pattern.
- `src/main/tax-reporting/domain/report-generator.service.ts` — Existing tax-reporting annual aggregation pattern.
- `src/main/tax-reporting/domain/report-generator.service.spec.ts` — Existing status and output tests.
- `src/shared/types/domain.ts` — Shared status/category enums from task 01.
- `src/main/tax-reporting/domain/capital-gains-assessment.service.ts` — Sale traces and blockers from task 03.

### Dependent Files

- `src/main/tax-reporting/application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.use-case.ts` — Will return monthly rows and annual totals from this task.
- `src/renderer/pages/CapitalGainsPage.tsx` — Will display month statuses, totals, and blockers.
- `src/preload/contracts/tax-reporting/capital-gains-assessment.contract.ts` — Will validate/transport classified monthly output.

### Related ADRs

- [ADR-002: Annual Month-by-Month Assessment as V1 Product Approach](adrs/adr-002.md) — Requires monthly rows as the primary product output.
- [ADR-004: Current-Year Assessment With Corporate Action Support](adrs/adr-004.md) — Requires current-year-only loss compensation and category separation.

## Deliverables

- Monthly classification and loss compensation service behavior.
- Annual totals derived from monthly rows.
- Blocker-aware status selection for ready, pending, unsupported, and mixed months.
- Unit tests with 80%+ coverage **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Stock month with total ordinary sales below R$ 20,000 and positive gain produces exempt stock gain.
  - [x] Stock month with total ordinary sales equal to R$ 20,000 and positive gain produces exempt stock gain.
  - [x] Stock month above R$ 20,000 produces taxable gain when positive.
  - [x] FII gain with sales below R$ 20,000 remains taxable and is not exempt.
  - [x] ETF gain with sales below R$ 20,000 remains taxable and is not exempt.
  - [x] Stock losses compensate later stock gains but not FII or ETF gains.
  - [x] FII losses compensate later FII gains but not stock or ETF gains.
  - [x] Mixed month contains supported totals and visible blockers.
  - [x] Annual totals equal the sum of monthly rows.
- Integration tests:
  - [x] Task 03 sale traces feed monthly classification without losing source trace details.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- 100% of assessed months receive an explicit status.
- FIIs and ETFs never receive stock exemption treatment.
- Loss compensation remains same-category and current-year only.
