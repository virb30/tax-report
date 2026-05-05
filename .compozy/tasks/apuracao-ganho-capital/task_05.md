---
status: completed
title: Add Generate Capital Gains Assessment Use Case
type: backend
complexity: medium
dependencies:
  - task_02
  - task_04
---

# Task 5: Add Generate Capital Gains Assessment Use Case

## Overview

Add the application use case that composes the assessment query and domain services into
one backend workflow. This task provides the main process behavior that IPC will expose in
the next task.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `GenerateCapitalGainsAssessmentUseCase` under the tax-reporting application layer.
- MUST accept `baseYear` and query only facts for that selected tax year.
- MUST return render-ready monthly rows, annual totals, summary blockers, and `generatedAt`.
- MUST derive annual values from monthly rows produced by task 04.
- MUST not call another use case directly.
- SHOULD keep orchestration thin and leave tax rules in domain services.
</requirements>

## Subtasks

- [x] 5.1 Create the use case file in `generate-capital-gains-assessment`.
- [x] 5.2 Compose the query port and assessment services through constructor injection.
- [x] 5.3 Return the approved output DTO with generated timestamp and summary blockers.
- [x] 5.4 Add use case tests with mocked query and deterministic assessment fixtures.
- [x] 5.5 Confirm empty-year output remains valid and renderable.

## Implementation Details

Follow the TechSpec "Component Overview" and the existing `GenerateAssetsReportUseCase`
style. The use case should orchestrate dependencies and avoid embedding calculation
rules.

### Relevant Files

- `src/main/tax-reporting/application/use-cases/generate-asset-report/generate-assets-report.use-case.ts` — Existing tax-reporting use case orchestration.
- `src/main/tax-reporting/application/use-cases/generate-asset-report/generate-assets-report.use-case.spec.ts` — Existing use case test style.
- `src/main/tax-reporting/application/use-cases/generate-asset-report/generate-asset-report.input.ts` — Existing input DTO pattern.
- `src/main/tax-reporting/application/use-cases/generate-asset-report/generate-asset-report.output.ts` — Existing output DTO pattern.
- `src/main/tax-reporting/application/queries/capital-gains-assessment.query.ts` — Query dependency from task 02.
- `src/main/tax-reporting/domain/capital-gains-assessment.service.ts` — Domain assessment dependency from tasks 03 and 04.

### Dependent Files

- `src/main/tax-reporting/transport/handlers/report/report-ipc-handlers.ts` — Will call the use case in task 06.
- `src/main/app/infra/container/index.ts` — Will register the use case in task 06.
- `src/preload/contracts/tax-reporting/capital-gains-assessment.contract.ts` — Will expose this use case output.

### Related ADRs

- [ADR-001: Additive Monthly Assessment Before DARF Engine](adrs/adr-001.md) — Keeps use case scope to assessment.
- [ADR-003: Tax Reporting Read Model for Capital Gains Assessment](adrs/adr-003.md) — Requires backend use case returning render-ready output.

## Deliverables

- `GenerateCapitalGainsAssessmentUseCase` with constructor-injected dependencies.
- Use case input/output integration with task 01 DTOs.
- Focused use case specs with query and service doubles.
- Unit tests with 80%+ coverage **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Use case calls `findSourceFacts` with the requested `baseYear`.
  - [x] Use case returns `baseYear`, `generatedAt`, monthly rows, annual totals, and summary blockers.
  - [x] Empty selected-year facts return an empty but valid assessment output.
  - [x] Domain service blockers are preserved in summary blockers.
- Integration tests:
  - [x] Use case accepts the concrete query output shape from task 02 and concrete service output from task 04.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- IPC wiring can expose one complete use case without adding tax logic to transport handlers.
- The use case does not mutate source data.
