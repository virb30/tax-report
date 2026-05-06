# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Dismantle `src/shared/types/domain.ts` so renderer/public IPC types are IPC-owned and backend-only semantics are main-owned.
- Existing workspace already contains task_01/task_02-style movement into `src/ipc/**`, while `_tasks.md` still marks task_02 pending; proceed against actual code state and avoid changing unrelated prior diffs.

## Important Decisions
- Public DTO enum ownership should remain in `src/ipc/contracts/domain.ts`; backend internal ownership should move to `src/main/shared/types/domain.ts` for cross-context concepts used by portfolio, ingestion, and tax-reporting.

## Learnings
- `src/preload/contracts/**` is already deleted in the workspace; task references to preload contract files map to current `src/ipc/contracts/**` files.

## Files / Surfaces
- Added `src/main/shared/types/domain.ts` and `src/main/shared/types/domain.spec.ts` for backend-owned cross-context domain enums and import DTO-adjacent internal types.
- Reduced `src/shared/types/domain.ts` to an empty module and rewrote all `src/main/**` imports to resolve to `src/main/shared/types/domain.ts`.
- Updated ingestion import/preview/consolidated-position use cases, initial-balance use cases, parser interfaces, and import review domain services so affected application/domain code no longer imports IPC contracts.
- Added IPC public enum stability coverage in `src/ipc/public/index.test.ts`.

## Errors / Corrections
- `CLAUDE.md` is not present at the repository root; loaded `AGENTS.md`, `/home/virb30/.codex/RTK.md`, project rules, PRD task docs, TechSpec, and ADRs instead.
- `npx tsc --noEmit` still reports pre-existing strict type errors in unrelated files; task validation used repository-required `npm run lint`, `npm run format`, and `npm test`, all passing after the final edits.

## Ready for Next Run
- Verification evidence for this task: `npm test` passed 83 suites / 401 tests with global coverage 92.59 statements, 80.74 branches, 94.96 functions, 92.74 lines; `npm run lint` and `npm run format` passed after final formatting.
