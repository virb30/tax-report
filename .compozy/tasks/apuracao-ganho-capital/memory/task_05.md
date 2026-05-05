# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Add the task 05 tax-reporting application use case that composes the capital gains
  query, sale assessment service, and loss compensation service into the backend workflow
  later exposed by IPC.

## Important Decisions
- Keep the use case thin: it will query selected-year facts, call domain services in
  sequence, add `generatedAt`, and return the approved DTO without embedding tax rules.

## Learnings
- The target `generate-capital-gains-assessment` folder already exists from task 01 DTO
  work; task 05 only needs the use case and focused orchestration tests there.
- `npm test` runs the full Jest suite with coverage and passed after task 05 changes with
  82 suites / 413 tests and global coverage above 80%.
- Final verification after tracking updates: `npm run lint`, `npm test`, and
  `npm run package` passed; repo-wide `npm run format` remains blocked by existing
  formatting drift outside task 05.

## Files / Surfaces
- `src/main/tax-reporting/application/use-cases/generate-capital-gains-assessment/`
- Added `generate-capital-gains-assessment.use-case.ts`.
- Added `generate-capital-gains-assessment.use-case.spec.ts`.

## Errors / Corrections
- A filtered `npm test -- --runTestsByPath ...` run executed the focused spec but exited
  non-zero because the repo wrapper still enforced global coverage on the filtered run;
  direct `npx jest --runTestsByPath ... --coverage=false` passed the focused spec.
- `npm run format` still fails on many pre-existing files outside task 05 scope; the new
  use case files were not listed in the formatter warnings.

## Ready for Next Run
- Task 06 can wire `GenerateCapitalGainsAssessmentUseCase` into IPC/container without
  adding tax calculation logic to transport handlers.
