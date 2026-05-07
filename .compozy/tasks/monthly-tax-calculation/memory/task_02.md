# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Add upstream read/event seams required for monthly tax recalculation: daily broker tax period reads, asset classification change event publication, and container dependency typing for tax-reporting access to shared/portfolio/ingestion.

## Important Decisions
- Keep this task limited to cross-context seams. No monthly tax calculation logic is added to portfolio or ingestion.
- Publish the asset classification event from the portfolio repair use case after canonical asset save and position reprocessing, using the earliest affected transaction year.
- Expose ingestion daily broker tax access through `TaxReportingModule.repositories` so later monthly tasks can consume the dependency without reaching across module internals.

## Learnings
- Baseline: daily broker tax repository has no period read yet; no asset classification change event exists; tax-reporting module currently accepts shared + portfolio only.
- No `CLAUDE.md` exists under the workspace tree; task guidance comes from `AGENTS.md`, repo rules, PRD, TechSpec, and ADRs.
- `rg` is unavailable in this environment; use `rtk proxy grep` / `rtk proxy find` for repository searches.
- Verification passed after implementation: focused main Jest set, lint, format, full `npm test` coverage, and `npm run package`.

## Files / Surfaces
- Planned: daily broker tax repository contract/Knex implementation, shared domain events, repair asset type use case/container, app container types, tax-reporting container wiring/tests.
- Touched for task 02: `daily-broker-tax.repository.ts`, `knex-daily-broker-tax.repository.ts`, new `asset-tax-classification-changed.event.ts`, `repair-asset-type.use-case.ts`, portfolio/tax-reporting/app composition files, and focused specs for these seams.

## Errors / Corrections
- Fixed focused-test failure by importing `repairAssetTypeContract` in the portfolio container spec.

## Ready for Next Run
- Task 02 implementation is verified and ready for manual review. Automatic commit was disabled.
