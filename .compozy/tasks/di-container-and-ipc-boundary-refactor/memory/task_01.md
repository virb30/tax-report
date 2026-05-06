# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Move public IPC contracts from `src/preload/contracts/**` to `src/ipc/contracts/**` as a direct cut for app, portfolio, ingestion, and tax-reporting.
- Preserve existing channel names, renderer API method names, validation semantics, and error modes.
- Rehome renderer-facing DTO/enums in IPC-owned contract modules instead of having the moved contracts import `src/shared/types/domain.ts`.

## Important Decisions
- `CLAUDE.md` is absent in this checkout; proceed with `AGENTS.md`, RTK, project rules, task file, TechSpec, and ADRs.
- Moved generic IPC contract helpers (`contract-types`, `define-ipc-contract`, `ipc-result`) into `src/ipc` so `src/ipc/contracts/**` does not depend back on preload runtime-adjacent modules.
- Left preload registry/bridge runtime in `src/preload/**` for this task, with imports redirected to `src/ipc/**`.

## Learnings
- `rg` is not installed in this environment; use `find`/`grep` through `rtk` for repository searches.
- Pre-existing worktree changes exist in `.nvmrc` and `package-lock.json`; they are unrelated and must not be reverted.
- Public IPC enum duplication required updating one application comparison to use `IpcTransactionType` where the value comes from an IPC-owned DTO.
- `npm run test:prepare` was required before main integration tests because `better-sqlite3` initially had a stale Node ABI.

## Files / Surfaces
- Original public contract ownership was under `src/preload/contracts/**`.
- Immediate contract consumers include `src/preload/ipc/**`, `src/preload/renderer/electron-api.ts`, `src/preload/preload.test.ts`, main transport handlers/registrars/tests, and renderer type imports.
- New public contract ownership is under `src/ipc/contracts/**`.
- Added focused contract tests under `src/ipc/contracts/**` for app, ingestion import, portfolio assets/brokers/portfolio, and tax-reporting report contracts.
- Updated `jest.config.ts` coverage collection to include `src/ipc/**/*.ts`.

## Errors / Corrections
- Initial focused Jest run failed only because `better-sqlite3` was compiled for a different Node ABI; `npm run test:prepare` rebuilt it and the same test set passed.
- `npx tsc --noEmit` still reports unrelated pre-existing value-object typing errors in portfolio tests/use cases and one repository generic issue; the repository does not define this as a required task gate.
- ESLint exposed type-assertion cleanups in tests and one enum comparison after the move; fixed before final verification.

## Ready for Next Run
- Verified with `npm run lint`, `npm run format`, and `npm test`.
- Focused contract/preload/main integration Jest run passed with 10 suites / 46 tests and 100% coverage on moved contract modules.
- Full `npm test` passed with 81 suites / 396 tests and global coverage at 92.37% statements, 80.37% branches, 95.12% functions, and 92.53% lines.
