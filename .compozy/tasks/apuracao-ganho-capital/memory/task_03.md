# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement a backend-only `CapitalGainsAssessmentService` that consumes task 01 capital
  gains source facts and emits sale-level traces plus blockers for cost-basis issues.

## Important Decisions
- Keep task 03 output at the sale-assessment level (`saleTraces` and `blockers`) so task
  04 can own monthly tax classification and loss compensation.
- Treat same-day buy/sell pairs for the same ticker as unsupported day trade source facts
  and skip those ordinary buy/sell rows from ready cost-basis calculation.
- Use gross sale proceeds as the trace `saleProceeds` and deduct allocated fees in
  `grossResult`; buy and transfer-in fees increase acquisition cost.

## Learnings
- The task 03 service did not exist before this run; the pre-change signal is the missing
  `src/main/tax-reporting/domain/capital-gains-assessment.service.ts` file.
- Full `npx tsc --noEmit` still fails on pre-existing portfolio/renderer typing issues,
  but no task 03 files are listed after the category narrowing fix.
- Repo-wide `npm run format` still fails on a pre-existing formatting backlog; focused
  Prettier checks pass for the task 03 files.

## Files / Surfaces
- Added: `src/main/tax-reporting/domain/capital-gains-assessment.service.ts`
- Added: `src/main/tax-reporting/domain/capital-gains-assessment.service.spec.ts`

## Errors / Corrections
- Corrected a TypeScript narrowing issue where sale traces needed a non-null supported
  category after classification blockers had already filtered unsupported transactions.

## Ready for Next Run
- Implementation and tests are in place, but task tracking was intentionally left pending
  because final verification is not fully clean while repo-wide format fails outside this
  task scope.
