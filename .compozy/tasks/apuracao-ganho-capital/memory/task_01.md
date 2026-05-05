# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Define the capital gains assessment DTO foundation for the tax-reporting workflow:
  shared cross-boundary enums, use case input/output DTOs, source fact DTOs, and focused
  coverage. Scope excludes persistence, DARF generation, paid-tax memory, and prior-year
  loss entry.

## Important Decisions
- Keep assessment statuses, categories, blocker codes, and trace classifications in
  `src/shared/types/domain.ts` because they cross main/preload/renderer boundaries.
- Add a lightweight preload contract DTO file now so compile-time imports can validate the
  renderer-facing shape; leave IPC channel/Zod validation for the later IPC task.

## Learnings
- `CLAUDE.md` was requested by the task prompt but is not present at the repository root.
- `rg` is not available in this environment; PowerShell `Get-ChildItem` is the fallback.
- `npm run test:prepare` is needed in this environment before Jest because
  `better-sqlite3` was initially compiled for a different Node module version.
- Standalone `npx tsc --noEmit` currently fails on pre-existing portfolio/renderer typing
  errors unrelated to this task; Jest/ts-jest compilation is the actionable TypeScript
  verification signal for this task.

## Files / Surfaces
- Touched surfaces: `src/shared/types/domain.ts`,
  `src/main/tax-reporting/application/use-cases/generate-capital-gains-assessment/`,
  `src/preload/contracts/tax-reporting/capital-gains-assessment.contract.ts`, and
  `src/main/ingestion/application/use-cases/list-daily-broker-taxes/`.

## Errors / Corrections
- First focused Jest command accidentally ran the whole main project; rerun with
  `--runTestsByPath` for the DTO spec.
- Full `npm test` initially had all suites passing but failed the global branch coverage
  threshold at 79.65%; added real behavior coverage for `ListDailyBrokerTaxesUseCase`.

## Ready for Next Run
- DTO implementation and tests are in place. Final verification evidence: focused DTO spec
  passed, full `npm test` passed with 78 suites / 379 tests and 80.08% branch coverage,
  `npm run lint` passed, touched-file Prettier check passed. Repo-wide `npm run format`
  still fails on pre-existing files outside the task scope.
