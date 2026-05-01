# Task Memory: task_09.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Add the explicit legacy asset-type repair backend flow and replace the legacy broker-allocation assets report with declaration-oriented on-demand assembly in the main process.
- Keep report status ephemeral/on-demand and preserve broker data only as supporting summary output.

## Important Decisions

- Treat `AGENTS.md` plus PRD/ADR documents as the authoritative guidance set because `CLAUDE.md` is absent from this workspace.
- Use the existing `RecalculatePositionUseCase` as the authoritative year reprocessing path instead of introducing direct position mutation during repair.
- Keep declaration-item assembly fully in the main process and compute `previousYearValue`, `currentYearValue`, eligibility, pending issues, and `canCopy` on demand from transaction history plus canonical catalog metadata.
- Keep renderer changes minimal in this task: `ReportPage` was only reshaped enough to consume the new DTO and keep the test/build surface compatible, without pulling task_10 UI scope into task_09.

## Learnings

- The current `GenerateAssetsReportUseCase` still maps `ReportGenerator` output directly to broker-level `allocations`, so task_09 must replace both the domain report service and the shared IPC/output contracts.
- The asset catalog IPC surface currently exposes only `listAssets` and `updateAsset`; `repairAssetType` needs a new contract, handler, registrar wiring, preload typing, and integration coverage.
- Historical year-end values are more reliable when reconstructed from transaction cutoffs with `PositionCalculatorService` than when inferred from current persisted positions alone, especially after the initial-balance document refactor.
- Repo-wide Prettier drift remains outside this task. `npm run format` still fails on many unrelated files even though `npm run lint` and `npm test` pass after the task changes.

## Files / Surfaces

- `.compozy/tasks/correcao-bens-direitos/memory/{MEMORY.md,task_09.md}`
- `src/main/application/use-cases/generate-asset-report/*`
- `src/main/application/use-cases/repair-asset-type/*`
- `src/main/application/services/reprocess-ticker-years.service.ts`
- `src/main/domain/tax-reporting/*`
- `src/shared/contracts/assets-report.contract.ts`
- `src/shared/contracts/assets.contract.ts`
- `src/shared/ipc/contracts/assets/*`
- `src/shared/ipc/contracts/report/*`
- `src/shared/ipc/ipc-channels.ts`
- `src/shared/types/electron-api.ts`
- `src/main/application/repositories/{asset.repository.ts,transaction.repository.ts,asset-position.repository.ts}`
- `src/main/ipc/{handlers,registrars}/**/*report*`
- `src/main/ipc/{handlers,registrars}/assets/*`
- `src/main/infrastructure/container/index.ts`
- `src/renderer/pages/ReportPage.tsx`
- related unit/integration tests around report/assets/application contracts, preload, renderer mocks, and IPC contracts

## Errors / Corrections

- `rg` is not available in this PowerShell environment, so repository searches for this task are using `Get-ChildItem` and `Select-String`.
- `npm run format` is not a reliable task-local gate in the current worktree because unrelated files already violate Prettier; task verification therefore relies on fresh lint/test/build evidence plus the explicit known format limitation.

## Ready for Next Run

- Final verification after implementation: `npm run lint` passed, `npm test` passed with coverage above thresholds, and `npm run package` passed. `npm run format` still fails because of pre-existing repo-wide formatting drift unrelated to task_09 changes.
