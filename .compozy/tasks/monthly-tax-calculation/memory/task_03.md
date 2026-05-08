# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement pure monthly tax input-normalization domain services for asset class resolution and IRRF allocation.
- Required outcomes: explicit supported/unsupported monthly asset classes, proportional daily IRRF allocation, missing daily tax blocking signals, focused unit and integration-style specs.

## Important Decisions
- Keep the services under `src/main/tax-reporting/domain/services` per the TechSpec monthly component names.
- Use feature-local monthly tax types instead of expanding shared `AssetType`; unit classification is derived only from stock-class tickers ending in `11`.
- Keep IRRF allocation keyed by trade date and broker, and allocate only across supported sale operations by gross sale amount.
- Existing zero-IRRF daily rows are valid allocation inputs; missing rows and non-positive supported sale totals are returned as blocking `missingInputs`.

## Learnings
- `CLAUDE.md` is not present in `/home/virb30/workspace/tax-report` or parent workspace paths; available guidance is `AGENTS.md`, RTK, and `.agents/rules/*`.
- Existing Task 01/02 changes are already uncommitted in the workspace, including monthly close persistence and daily broker tax period reads.
- Focused monthly normalization specs pass with 3 suites / 9 tests using `npx jest --selectProjects main --runTestsByPath ... --coverage=false`.
- Final validation passed: `npm run lint`, `npm run format`, and `npm test`. Full Jest result was 88 suites / 426 tests passing with overall coverage above 80%; monthly domain services reported 100% coverage.

## Files / Surfaces
- Added: `src/main/tax-reporting/domain/services/monthly-tax-asset-class-resolver.service.ts`
- Added: `src/main/tax-reporting/domain/services/monthly-tax-asset-class-resolver.service.spec.ts`
- Added: `src/main/tax-reporting/domain/services/monthly-tax-irrf-allocator.service.ts`
- Added: `src/main/tax-reporting/domain/services/monthly-tax-irrf-allocator.service.spec.ts`
- Added: `src/main/tax-reporting/domain/services/monthly-tax-input-normalization.integration.spec.ts`

## Errors / Corrections

## Ready for Next Run
- Task tracking was updated after verification. Automatic commit is disabled, so changes are left in the working tree for manual review.
