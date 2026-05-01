# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Replace the legacy single-broker initial-balance command with document-oriented save, list, and delete backend flows keyed by `ticker + year`.
- Keep `transactions` as the source of truth by replacing grouped `initial_balance` rows on save and grouping those rows back into documents on read.
- Preserve downstream position correctness by recalculating and persisting the resulting year position after save or delete.

## Important Decisions

- Replaced the old `setInitialBalance` contract surface with `saveInitialBalanceDocument`, `listInitialBalanceDocuments`, and `deleteInitialBalanceDocument` across shared contracts, IPC contracts, handlers, registrar wiring, and renderer API typing.
- Implemented grouped initial-balance document reads directly from `transactions` in the repository; no dedicated `initial_balance_documents` table was introduced.
- Added `InitialBalanceDocumentPositionSyncService` so save/delete flows can persist the resulting position using an explicit `assetType` source instead of relying on `initial_balance` rows to carry that metadata.
- Kept renderer compatibility minimal in this task by adapting existing callers to the new backend API with a single allocation; full document-oriented renderer behavior remains task 08 scope.

## Learnings

- Existing `initial_balance` transactions do not persist `assetType`, so document listing must enrich `assetType` from persisted positions and save/delete flows must synchronize the position explicitly after grouped transaction replacement.
- Awilix `CLASSIC` registration depends on constructor parameter names, so new use cases needed the full `initialBalanceDocumentPositionSyncService` parameter name to resolve cleanly from the container.
- The repository-level document grouping logic is the stable seam for multi-broker initial balances; IPC and use-case tests are easiest to keep deterministic by asserting grouped allocations rather than raw transaction order.

## Files / Surfaces

- `src/shared/contracts/initial-balance.contract.ts`
- `src/shared/types/electron-api.ts`
- `src/shared/ipc/contracts/portfolio/contracts.ts`
- `src/shared/ipc/ipc-channels.ts`
- `src/shared/ipc/contracts/ipc-contract-registry.test.ts`
- `src/main/application/repositories/transaction.repository.ts`
- `src/main/application/services/initial-balance-document-position-sync.service.ts`
- `src/main/application/use-cases/save-initial-balance-document/*`
- `src/main/application/use-cases/list-initial-balance-documents/*`
- `src/main/application/use-cases/delete-initial-balance-document/*`
- `src/main/infrastructure/repositories/knex-transaction.repository.ts`
- `src/main/infrastructure/repositories/knex-transaction.repository.test.ts`
- `src/main/infrastructure/container/index.ts`
- `src/main/infrastructure/container/index.test.ts`
- `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.ts`
- `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.test.ts`
- `src/main/ipc/handlers/ipc-handlers.integration.test.ts`
- `src/main/ipc/registrars/portfolio-ipc-registrar.ts`
- `src/main/ipc/registrars/portfolio-ipc-registrar.test.ts`
- `src/main/application/use-cases/application-contracts.integration.test.ts`
- `src/preload.test.ts`
- `src/renderer/pages/initial-balance-page/use-initial-balance.ts`
- `src/renderer/pages/InitialBalancePage.test.tsx`
- `src/renderer/pages/ImportConsolidatedPositionModal.test.tsx`
- `src/renderer/pages/PositionsPage.test.tsx`
- `src/renderer/App.e2e.test.tsx`

## Errors / Corrections

- `npm run format` still fails at repo scope because many unrelated files are not Prettier-clean; used targeted Prettier verification on touched files instead.
- `npm run lint` still fails at repo scope because ESLint hits a generated missing `.vite` asset path; used targeted ESLint verification on touched files instead.

## Ready for Next Run

- Task 08 can switch the renderer from the temporary single-allocation compatibility call to full document list/save/delete consumption without changing the backend contract again.
- Task 09 can rely on grouped initial-balance documents remaining transaction-derived and idempotent per `ticker + year`.
