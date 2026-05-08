# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement Task 01 only: derived monthly close persistence, including migration registration,
  tax-reporting repository contract, Knex implementation, and focused persistence tests.

## Important Decisions
- Keep the artifact table current-state only, keyed by `YYYY-MM`, following ADR-004. Revision history,
  recalculation, IPC, and renderer work are deferred to later tasks.
- Repository contract lives in `tax-reporting/application/repositories`; Knex adapter lives in
  `tax-reporting/infra/repositories` and is instantiated by the tax-reporting container from shared infrastructure.

## Learnings
- `CLAUDE.md` is not present at the repository root for this run.
- `rg` is unavailable in this environment; use `rtk proxy find` or direct targeted reads instead.
- `createTaxReportingModule` now requires shared infrastructure because the monthly close repository is constructed
  from the shared Knex connection; direct test callers must pass `shared`.
- SQLite needs `notNullable()` explicitly on the text `month` primary key for `PRAGMA table_info` to report it as
  non-null.

## Files / Surfaces
- Touched surfaces: shared database migrations, database migration tests, `src/main/tax-reporting`
  application/infra repository files, tax-reporting module composition, runtime module composition, and one IPC
  integration test caller. Also updated task tracking files.

## Errors / Corrections
- Pre-existing workspace changes were present in `tsconfig.json`, `.codex/`, and `.compozy/tasks/`; leave unrelated
  content intact.
- Corrected a direct IPC integration test call that omitted the new tax-reporting `shared` dependency.
- Tightened `findHistory()` to select summary columns only, leaving `detail_json` for detail reads.
- Targeted Jest initially failed before running tests because the pre-existing `tsconfig.json` change used
  `ignoreDeprecations: "6.0"`, which TypeScript 5.9 rejects. Narrowly changed it to `"5.0"` to unblock verification.
- `better-sqlite3` needed `npm run test:prepare` rebuild before DB tests could execute under the current Node ABI.
- Direct `tsc --noEmit` caught the production `main.ts` composition call site and the Knex row timestamp type; both
  were fixed before final verification.

## Ready for Next Run
- Task 01 implementation is verified. Commands run after final code changes: `npx tsc --noEmit`, `npm run format`,
  `npm run lint`, and `npm test` with coverage.
