# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement monthly classification and same-category current-year loss compensation for
  task 03 sale traces and blockers.

## Important Decisions
- Added a separate `CapitalGainsLossCompensationService` instead of expanding
  `CapitalGainsAssessmentService`; task 03 remains responsible for sale-level cost-basis
  traces, task 04 for monthly tax classification and compensation.
- Status rule used in the service: supported traces plus any blocker => `mixed`;
  blocker-only months with pending-type blockers => `pending`; blocker-only months with
  only unsupported blockers => `unsupported`; months without blockers => `ready`.
- Selected-year loss balances start at zero per supported category and are carried
  chronologically across assessed months only within that service invocation.

## Learnings
- Focused Jest paths still trigger the repo's global coverage threshold because `npm test`
  delegates to `jest --coverage`; the task 03 focused suite passed tests but exited
  non-zero on global coverage.
- Full `npm test` is the correct coverage gate for completion; the final run reported 81
  suites and 408 tests passing with global coverage above 80%.

## Files / Surfaces
- Added `src/main/tax-reporting/domain/capital-gains-loss-compensation.service.ts`.
- Added `src/main/tax-reporting/domain/capital-gains-loss-compensation.service.spec.ts`.

## Errors / Corrections

## Ready for Next Run
- Task 05 can compose the two domain services through the generate assessment use case.
- `npm run format` still fails on broad pre-existing formatting drift; only the new task
  files were formatted.
