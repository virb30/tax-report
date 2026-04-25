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

## 2026-04-24 Binding Helper Move Checkpoint

- Resumed from the recorded next step: move generic IPC validation/error helpers out of `controllers/` and into the `binding/` layer if safe.
- Next before implementation: run `npm run lint` again to capture this batch's baseline and ensure the final error count does not increase.

## 2026-04-24 Binding Helper Move Progress

- Ran `npm run lint` before implementation and captured the batch baseline: 98 errors.
- Moved generic IPC payload/error helpers from `src/main/ipc/controllers/ipc-handler.utils.ts` to `src/main/ipc/binding/ipc-payload.ts`.
- Moved the corresponding helper tests to `src/main/ipc/binding/ipc-payload.test.ts`.
- Updated `bind-ipc-contract.ts` and `ipc-error-mapper.ts` to depend on the binding-layer helper.
- Removed the obsolete controller-layer utility file and test.

## 2026-04-24 Binding Helper Move Verification

- `npx tsc --noEmit`: passed.
- Focused binding/handler tests without coverage: passed, 3 suites and 11 tests.
- `npm test`: passed, 56 suites and 257 tests, with global branch coverage at 80.33%.
- `npm run lint`: still fails on pre-existing issues, unchanged from the 98-error baseline.

## 2026-04-24 Binding Helper Move Next Step

Review whether `src/main/ipc/controllers/ipc-registry.ts` should remain controller-oriented or move toward a contract registry/composition module now that controllers are thin binders around contract handlers.

## 2026-04-24 IPC Registry Move Checkpoint

- Resumed from the recorded next step: review whether `src/main/ipc/controllers/ipc-registry.ts` should remain controller-oriented.
- Ran `npm run lint` before implementation and captured the batch baseline: 98 errors.

## 2026-04-24 IPC Registry Move Progress

- Moved IPC registration composition out of `src/main/ipc/controllers/` and into `src/main/ipc/registry/`.
- Replaced the controller-named registration interface with `IpcRegistrar`, keeping the existing `register(ipcMain)` contract stable.
- Updated controllers, binder tests, and the Awilix container to depend on the registry-layer registration types.
- Narrowed `IpcRegistry.registerAll` to require only the `handle` capability used by IPC registrars.
- Added focused coverage for `IpcRegistry.registerAll`.

## 2026-04-24 IPC Registry Move Verification

- `npx tsc --noEmit`: passed.
- Focused IPC registry/binder/controller/container tests without coverage: passed, 5 suites and 16 tests.
- `npm test`: passed, 57 suites and 258 tests, with global branch coverage at 80.33%.
- `npm run lint`: still fails on pre-existing issues, but improved from the 98-error baseline to 97 errors.

## 2026-04-24 IPC Registry Move Next Step

Continue cleanup by reviewing remaining controller classes. They are now thin contract binders; decide whether to keep them as context composition roots or rename/move them to a main-process IPC composition layer in a follow-up batch.

## 2026-04-24 IPC Registrar Rename Checkpoint

- Resumed from the recorded next step: review the remaining controller classes now that they only compose contract bindings.
- Ran `npm run lint` before implementation and captured the batch baseline: 97 errors.

## 2026-04-24 IPC Registrar Rename Progress

- Moved the thin IPC composition classes out of `src/main/ipc/controllers/` and into `src/main/ipc/registrars/`.
- Renamed controller classes to responsibility-based registrar names:
  - `AppIpcRegistrar`
  - `BrokersIpcRegistrar`
  - `ImportIpcRegistrar`
  - `PortfolioIpcRegistrar`
  - `ReportIpcRegistrar`
- Updated the Awilix container registrations and cradle names from `*Controller` to `*IpcRegistrar`.
- Updated IPC registrar tests and integration tests to use the new registrar module names.
- Removed the now-obsolete controller-layer IPC composition surface.

## 2026-04-24 IPC Registrar Rename Verification

- `npx tsc --noEmit`: passed.
- Focused registrar/registry/container/integration tests without coverage: passed, 5 suites and 14 tests.
- Focused Prettier check for changed files: passed.
- `npm test`: passed, 57 suites and 258 tests.
- `npm run lint`: still fails on pre-existing issues, but improved from the 97-error baseline to 96 errors.

## 2026-04-24 IPC Registrar Rename Next Step

Continue cleanup by reviewing whether `src/shared/ipc/ipc-channels.ts` should remain as a compatibility view over contract channels or be collapsed further now that main registration and preload generation are contract-first.

## 2026-04-24 IPC Channels Compatibility Checkpoint

- Resumed from the recorded next step: review whether `src/shared/ipc/ipc-channels.ts` should remain as a compatibility view over contract channels.
- Ran `npm run lint` before implementation and captured the batch baseline: 96 errors.

## 2026-04-24 IPC Channels Compatibility Progress

- Inverted the remaining channel ownership so contract definitions now declare their own transport channel strings.
- Refactored `src/shared/ipc/ipc-channels.ts` into a compatibility view derived from contract channel metadata instead of being the source consumed by contracts.
- Kept the existing grouped channel exports (`APP_IPC_CHANNELS`, `BROKERS_IPC_CHANNELS`, etc.) stable for tests and compatibility consumers.
- Added registry coverage that verifies `REGISTERED_IPC_CHANNELS` and `ELECTRON_API_CHANNELS` stay aligned with `ipcContracts` and `rendererExposedIpcContracts`.
- Confirmed no contract module imports `ipc-channels.ts` anymore.

## 2026-04-24 IPC Channels Compatibility Verification

- `npx tsc --noEmit`: passed.
- Focused contract/preload/registrar/integration tests without coverage: passed, 6 suites and 24 tests.
- Focused Prettier check for changed files: passed.
- `npm test`: passed, 57 suites and 259 tests.
- `npm run lint`: still fails on pre-existing issues, unchanged from the 96-error baseline.

## 2026-04-24 IPC Channels Compatibility Next Step

Continue cleanup by reviewing remaining uses of compatibility channel exports in tests. Prefer asserting against contract constants directly where doing so improves contract-first clarity without reducing test readability.

## 2026-04-24 IPC Test Channel Cleanup Checkpoint

- Resumed from the recorded next step: review remaining uses of compatibility channel exports in tests.
- Ran `npm run lint` before implementation and captured the batch baseline: 96 errors.

## 2026-04-24 IPC Test Channel Cleanup Progress

- Replaced registrar tests' direct dependency on grouped compatibility channel exports with contract constants and contract lists.
- Updated IPC handler integration coverage to retrieve registered handlers by contract channel metadata.
- Updated preload tests to assert `ipcRenderer.invoke` channel usage against operation contracts instead of `ELECTRON_API_CHANNELS`.
- Left `ipc-contract-registry.test.ts` as the only test consumer of `ipc-channels.ts`, because that test explicitly validates the compatibility view.
- Confirmed remaining `IPC_CHANNELS`, `ELECTRON_API_CHANNELS`, and `REGISTERED_IPC_CHANNELS` references are limited to `ipc-channels.ts` and its compatibility test.

## 2026-04-24 IPC Test Channel Cleanup Verification

- `npx tsc --noEmit`: passed.
- Focused preload/registrar/integration/compatibility tests without coverage: passed, 5 suites and 21 tests.
- Focused Prettier check for changed tests: passed.
- `npm test`: passed, 57 suites and 259 tests.
- `npm run lint`: still fails on pre-existing issues, unchanged from the 96-error baseline.

## 2026-04-24 IPC Test Channel Cleanup Next Step

Review whether `src/shared/ipc/ipc-channels.ts` still needs all grouped compatibility exports, or whether only `ELECTRON_API_CHANNELS` / `REGISTERED_IPC_CHANNELS` should remain temporarily for external compatibility.
