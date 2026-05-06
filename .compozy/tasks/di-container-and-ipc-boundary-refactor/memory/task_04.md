# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Split the main Awilix composition root into a per-start root bootstrap plus context-owned registration modules for app, portfolio, ingestion, and tax-reporting.
- Keep shared database/queue/cross-context infrastructure registered only from the root shared registration helper.

## Important Decisions
- The root container module now exports `createMainBootstrap(database)` instead of a global container or `registerDependencies`.
- The bootstrap return includes `container` for tests/diagnostics and `ipcRegistry` for `main.ts`; startup only consumes `ipcRegistry`.
- `registerSharedInfrastructure` owns `database`, `queue`, and `transactionFeeAllocator`; context modules do not duplicate these registrations.
- `PortfolioIpcRegistrar` remains portfolio-owned even though it depends on `ImportConsolidatedPositionUseCase` from ingestion, because the IPC channel belongs to the portfolio boundary.

## Learnings
- `rtk` is referenced by `/home/virb30/.codex/RTK.md` but is not installed in the current shell; direct shell commands are being used.
- `CLAUDE.md` was requested by the task prompt but is not present under the repository.
- Awilix `CLASSIC` mode works for existing asClass registrations when constructor parameter names match registration keys; factories are used where parser/use-case parameter names differ from registration keys.

## Files / Surfaces
- Touched surfaces: `src/main/app/infra/container/**`, `src/main/portfolio/infra/container/index.ts`, `src/main/ingestion/infra/container/index.ts`, `src/main/tax-reporting/infra/container/index.ts`, `src/main/main.ts`, and container/bootstrap tests.
- Replaced `src/main/app/infra/container/index.test.ts` with `src/main/app/infra/container/index.spec.ts`.

## Errors / Corrections
- A narrowed `npm test -- --runTestsByPath ...` run passed the container spec but exited non-zero because global coverage thresholds were enforced against a single test file; behavior was rechecked with `npx jest --selectProjects main --runTestsByPath ... --coverage=false`, then full `npm test` passed with coverage.
- Prettier initially reported formatting drift in new container files; fixed with Prettier on touched files.

## Ready for Next Run
- Verification completed for task 04: `npm run lint`, `npm run format`, `npm test`, `npm run package`, focused container+IPC integration specs, and `git diff --check` all passed.
- `npx tsc --noEmit` was run as an extra check and failed on existing broader worktree type errors outside the task 04 container/bootstrap changes; project scripts do not include a standalone typecheck gate.
