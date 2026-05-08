# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement backend-only monthly tax calculation and workspace state derivation for Task 04.
- Source documents read: AGENTS.md, PRD, TechSpec, task_04.md, _tasks.md, ADR-001, ADR-003, ADR-004, ADR-005. `CLAUDE.md` was requested but is absent at repository root.

## Important Decisions
- Keep this task domain-scoped: calculator and state resolver only. Persistence orchestration, IPC, and renderer integration remain later tasks.
- Use existing Task 01 repository summary types as the artifact boundary and replace `unknown` detail with a typed monthly detail payload for later use cases.
- The calculator emits all three fixed groups every month and derives state/outcome through `MonthlyTaxWorkspaceStateResolverService`, not renderer logic.
- V1 day trade handling is a blocked reason for same-day buy/sell on the same ticker; it is not calculated as day-trade tax output.

## Learnings
- Task 03 already provides `MonthlyTaxAssetClassResolverService` and `MonthlyTaxIrrfAllocatorService`; the calculator should consume resolved asset classes and allocated/missing IRRF data instead of duplicating those concerns.
- `tsconfig.json` had `ignoreDeprecations: "6.0"`, which prevented TypeScript/Jest from compiling under the installed TypeScript version; changed it to `"5.0"` so verification can run.

## Files / Surfaces
- Touched surfaces: `src/main/tax-reporting/application/repositories/monthly-tax-close.repository.ts`, `src/main/tax-reporting/infra/repositories/knex-monthly-tax-close.repository.ts`, `src/main/tax-reporting/infra/repositories/knex-monthly-tax-close.repository.spec.ts`, `src/main/tax-reporting/domain/services/monthly-tax-calculator.service.ts`, `src/main/tax-reporting/domain/services/monthly-tax-calculator.service.spec.ts`, `src/main/tax-reporting/domain/services/monthly-tax-workspace-state-resolver.service.ts`, `src/main/tax-reporting/domain/services/monthly-tax-workspace-state-resolver.service.spec.ts`, `tsconfig.json`.

## Errors / Corrections
- `rg` is not installed in this environment; use `find`/`grep` fallback for searches.
- Initial sell/transfer replay needed explicit insufficient-position blocking before subtracting quantities; fixed during self-review.

## Ready for Next Run
- Task 04 implementation and verification are complete. Later use cases can persist `MonthlyTaxCloseArtifact` values emitted by `MonthlyTaxCalculatorService` and read typed `MonthlyTaxCloseDetail` payloads from the monthly close repository.
