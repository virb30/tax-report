# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Add typed asset catalog list and update backend APIs on top of the task 01 canonical `ticker_data` foundation without pulling repair or report-assembly behavior into scope.

## Important Decisions
- Treat `pendingOnly` as catalog rows missing canonical asset type or report-blocking issuer metadata.
- Treat `reportBlockingOnly` as rows missing issuer name or issuer CNPJ only, leaving asset-type repair for the broader pending filter.
- Follow the broker-management IPC convention for this slice: `assets:list` uses throw mode while `assets:update` returns `{ success, ... }` with registrar-level error mapping.

## Learnings
- The existing broker IPC pattern maps cleanly to this task: list contracts use throw mode while mutating contracts use result mode with registrar-level error mapping.
- Running `npm run lint` concurrently with `npm run package` can hit a transient ENOENT inside generated `src/renderer/.vite` assets; rerunning lint after packaging succeeds once the generated tree stabilizes.

## Files / Surfaces
- Planned touches: shared asset contracts and IPC registry, asset catalog use cases, asset IPC handlers/registrar, DI container, preload typing, and regression tests.
- Implemented touches: `src/shared/contracts/assets.contract.ts`, `src/shared/ipc/contracts/assets/*`, `src/main/application/use-cases/list-assets/*`, `src/main/application/use-cases/update-asset/*`, `src/main/ipc/handlers/assets/asset-ipc-handlers.ts`, `src/main/ipc/registrars/assets-ipc-registrar.ts`, `src/main/infrastructure/container/index.ts`, `src/preload.test.ts`, `src/shared/ipc/contracts/ipc-contract-registry.test.ts`, and `src/main/ipc/handlers/ipc-handlers.integration.test.ts`.

## Errors / Corrections
- Fixed initial syntax mistakes in the new use-case specs and aligned the preload exposed-key assertion with the actual sorted API key order.
- Re-ran lint after packaging because the first concurrent lint run failed on a transient generated `.vite` asset path rather than source code errors.

## Ready for Next Run
- Task 02 backend asset catalog APIs are implemented and verified; task 03 can consume typed `listAssets` and `updateAsset` renderer APIs directly.
