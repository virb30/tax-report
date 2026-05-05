# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Add the tax-reporting capital gains assessment read/query port and a side-effect-free
  Knex adapter that returns selected-year transactions, allocated fees, asset catalog
  metadata, and daily broker tax facts with deterministic ordering.

## Important Decisions
- Keep the source-fact DTOs in `tax-reporting/application/queries` and re-export from the
  existing task-01 facts file to avoid duplicate DTO definitions.
- Daily broker tax source facts expose both `fees` and `irrf` from `daily_broker_taxes`;
  no DARF behavior or mutation was added.

## Learnings
- `CLAUDE.md` is not present in this repository.
- `rg` is unavailable in the current shell; PowerShell discovery is being used instead.
- Repo-wide `npm run format` still fails on pre-existing formatting drift and did not
  list the newly added query files.

## Files / Surfaces
- `src/main/tax-reporting/application/queries`
- `src/main/tax-reporting/infra/queries`
- `src/main/tax-reporting/application/use-cases/generate-capital-gains-assessment/capital-gains-assessment-facts.ts`

## Errors / Corrections
- Initial query spec run failed because the broker fixtures reused a unique CNPJ; fixture
  data now assigns distinct broker CNPJs.

## Ready for Next Run
- Implemented `CapitalGainsAssessmentQuery`,
  `KnexCapitalGainsAssessmentQuery`, and in-memory SQLite coverage for empty years,
  selected-year filtering, allocated fees, asset metadata including BDR/missing cases,
  daily broker taxes, and same-day ordering.
- Verification evidence: focused query spec passed 5/5; `npm run lint` passed; `npm test`
  passed 79 suites / 384 tests with global coverage 92.36% statements, 80.39% branches,
  95.52% functions, 92.49% lines.
- PRD task tracking was not marked complete because the repo-wide `npm run format` gate
  remains red due to broad pre-existing formatting warnings.
