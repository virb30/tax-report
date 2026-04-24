# Contract-First IPC Progress

## Executed

- Loaded and reviewed `docs/_refacs/20260423-contract-first-ipc-implementation-plan.md`.
- Executed Batch 1 from the plan:
  - Added shared IPC contract primitives in `src/shared/ipc/contract-types.ts`.
  - Added `defineIpcContract` in `src/shared/ipc/define-ipc-contract.ts`.
  - Added the shared IPC contract registry in `src/shared/ipc/contracts/ipc-contract-registry.ts`.
  - Added broker IPC contracts in `src/shared/ipc/contracts/brokers/contracts.ts`.
  - Added main-process binder infrastructure in `src/main/ipc/binding/`.
  - Added broker contract handlers in `src/main/ipc/handlers/brokers/broker-ipc-handlers.ts`.
  - Refactored `BrokersController` to register broker operations through contract bindings.
  - Kept the manual preload bridge unchanged for this batch.
  - Added tests for contract registry uniqueness and binder behavior.
  - Preserved broker IPC integration coverage.
- Executed Phase 4 / preload bridge batch:
  - Added renderer-exposed contracts for import, portfolio, and report operations.
  - Expanded the shared IPC contract registry so every current preload channel is represented.
  - Added `src/preload-bridge/build-electron-api.ts` to derive the flat renderer API from exposed contracts.
  - Refactored `src/preload.ts` to expose the generated bridge while preserving the existing `ElectronApi` shape.
  - Added tests for preload bridge generation, duplicate API names, duplicate channels, and registry alignment.
  - Used `src/preload-bridge/` instead of the planned `src/preload/bridge/` because `src/preload.ts` already occupies that basename on Windows.

## Verification

- `npx tsc --noEmit`: passed.
- Focused preload/contract tests: passed, 3 test suites and 11 tests.
- `npm test`: passed, 56 test suites and 259 tests.
- Changed-file ESLint check: passed.
- `npm run lint`: failed on pre-existing baseline issues outside this batch.

## Next Step

Proceed to Phase 5 / next batch: migrate remaining contexts to contract-first main-process registration, starting with `report` and `app`.

## 2026-04-24 Checkpoint

- Resumed from `docs/_refacs/20260423-contract-first-ipc-implementation-plan.md`.
- Confirmed the recorded next step is Phase 5: migrate remaining contexts to contract-first main-process registration, starting with `report` and `app`.
- Next before implementation: run `npm run lint` to capture the baseline error count, then migrate `report` and `app` without increasing lint errors.

## 2026-04-24 Phase 5 Progress

- Ran `npm run lint` before implementation and captured the baseline: 100 errors.
- Migrated `app` main-process registration to contract-first IPC:
  - Added `src/shared/ipc/contracts/app/`.
  - Added `src/main/ipc/handlers/app/app-ipc-handlers.ts`.
  - Refactored `AppController` to register `healthCheckContract` via `bindIpcContract`.
- Migrated `report` main-process registration to contract-first IPC:
  - Added `src/main/ipc/handlers/report/report-ipc-handlers.ts`.
  - Refactored `ReportController` to register `generateAssetsReportContract` via `bindIpcContract`.
- Added app contracts to the shared IPC contract registry while keeping app health check out of the renderer-exposed preload API.

## 2026-04-24 Verification

- `npx tsc --noEmit`: passed.
- Focused IPC/registry tests without coverage: passed, 3 suites and 9 tests.
- `npm test`: passed, 56 suites and 259 tests.
- `npm run lint`: still fails with the existing baseline count of 100 errors; the count did not increase.

## 2026-04-24 Next Step

Continue Phase 5 by migrating the next remaining main-process context to contract-first registration, likely `portfolio`, then `import` after the larger portfolio surface is stable.

## 2026-04-24 Portfolio Checkpoint

- Resumed from the recorded next step: continue Phase 5 by migrating `portfolio` to contract-first main-process registration.
- Next before implementation: run `npm run lint` again to capture this batch's baseline and ensure the final error count does not increase.

## 2026-04-24 Portfolio Progress

- Ran `npm run lint` before implementation and captured the batch baseline: 100 errors.
- Migrated `portfolio` main-process registration to contract-first IPC:
  - Added `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.ts`.
  - Refactored `PortfolioController` to bind all seven portfolio contracts via `bindIpcContract`.
  - Removed duplicate portfolio schemas and channel constants from the controller; shared contracts now own validation metadata.
- Adjusted `IpcContractOutput` inference so contracts that intentionally return `void` are typed correctly.
- Preserved renderer-facing behavior for `recalculatePosition` by awaiting the use case and returning `void` at the IPC contract boundary.
- Adapted `listPositions` output at the IPC boundary so the shared contract receives the expected `AssetType` shape.

## 2026-04-24 Portfolio Verification

- `npx tsc --noEmit`: passed.
- Focused IPC/registry tests without coverage: passed, 3 suites and 9 tests.
- `npm test`: passed, 56 suites and 259 tests.
- `npm run lint`: still fails with the existing baseline count of 100 errors; the count did not increase.

## 2026-04-24 Portfolio Next Step

Continue Phase 5 by migrating the remaining `import` main-process context to contract-first registration.

## 2026-04-24 Import Checkpoint

- Resumed from the recorded next step: continue Phase 5 by migrating `import` to contract-first main-process registration.
- Next before implementation: run `npm run lint` again to capture this batch's baseline and ensure the final error count does not increase.

## 2026-04-24 Import Progress

- Ran `npm run lint` before implementation and captured the batch baseline: 100 errors.
- Migrated `import` main-process registration to contract-first IPC:
  - Added `src/main/ipc/handlers/import/import-ipc-handlers.ts`.
  - Refactored `ImportController` to bind `importSelectFileContract`, `previewImportTransactionsContract`, and `confirmImportTransactionsContract` via `bindIpcContract`.
  - Removed duplicate import schemas and raw channel registration from the controller.
- Preserved the existing native file picker behavior and confirmed import result mapping in the import handler.

## 2026-04-24 Import Verification

- `npx tsc --noEmit`: passed.
- Focused import/IPC/registry tests without coverage: passed, 4 suites and 14 tests.
- `npm test`: passed, 56 suites and 259 tests.
- `npm run lint`: still fails with the existing baseline count of 100 errors; the count did not increase.

## 2026-04-24 Import Next Step

Phase 5 main-process context migration is complete for the currently registered contexts (`brokers`, `report`, `app`, `portfolio`, and `import`). Next, review and remove remaining obsolete manual IPC utilities or duplication where safe, starting with controller tests and `registerValidatedHandler` usage.

## 2026-04-24 IPC Cleanup Checkpoint

- Resumed from the recorded next step: review and remove remaining obsolete manual IPC utilities or duplication where safe, starting with `registerValidatedHandler` usage.
- Next before implementation: run `npm run lint` again to capture this batch's baseline and ensure the final error count does not increase.

## 2026-04-24 IPC Cleanup Progress

- Ran `npm run lint` before implementation and captured the batch baseline: 100 errors.
- Removed the obsolete `registerValidatedHandler` API after confirming all runtime IPC registrations had moved to `bindIpcContract`.
- Kept `parseIpcPayload` and `buildIpcErrorMessage` because they are still used by the binder and IPC error mapper.
- Updated `ipc-handler.utils.test.ts` to cover the remaining parsing/error-message responsibilities and fallback branches.
- Fixed type-only imports in `src/main/ipc/controllers/ipc-registry.ts`, reducing the current lint error count.

## 2026-04-24 IPC Cleanup Verification

- `npx tsc --noEmit`: passed.
- Focused IPC utility/binder/handler tests without coverage: passed.
- `npm test`: passed on rerun, 56 suites and 257 tests, with global branch coverage at 80.33%.
- `npm run lint`: still fails on pre-existing issues, but improved from the 100-error baseline to 98 errors.

## 2026-04-24 IPC Cleanup Next Step

Continue cleanup by evaluating whether `parseIpcPayload` and `buildIpcErrorMessage` should move from `src/main/ipc/controllers/ipc-handler.utils.ts` into the `binding/` layer now that controllers no longer own generic IPC validation.
