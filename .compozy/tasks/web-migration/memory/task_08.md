# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Retire the remaining active desktop distribution path after task 06/07 moved the product to independent backend/frontend web projects.

## Important Decisions
- Keep root `package.json` only as inert repository metadata with no scripts or dependencies, so backend/frontend remain independently owned while tests can assert root desktop scripts are absent.
- Remove the root `src` tree entirely from the active runtime path because backend/frontend copies now own the web product source and root desktop IPC/preload/main code should no longer compile or test.

## Learnings
- `CLAUDE.md` is not present in the repository root; `AGENTS.md`, RTK guidance, repo rules, PRD, TechSpec, and ADRs were loaded.
- Remaining active desktop surfaces before task 08 edits are root Electron/Vite/Jest/Tailwind configs, root package manifest/lock, and root `src/ipc`, `src/preload`, and desktop `src/main` entry/runtime files.
- Parity evidence after retirement: backend targeted API integration passed 7 tests, frontend targeted browser E2E passed 3 tests covering the seven core workflow areas, backend full tests passed 390 tests at 92.35% statement / 80.5% branch coverage, and frontend full tests passed 50 tests at 87.74% statement / 80.15% branch coverage.

## Files / Surfaces
- Expected task surfaces: root package/config/docs, root `src/**` desktop leftovers, frontend tests with legacy Electron-oriented mock names, and backend/frontend static verification tests.
- Touched surfaces: `README.md`, `package.json`, backend/frontend README wording, root desktop config deletions, root `src/**` deletion, frontend mock naming/text cleanup, and `backend/src/app/infra/runtime/web-only-distribution.spec.ts`.

## Errors / Corrections
- `rtk` is installed at `/home/virb30/.local/bin/rtk` but is not on the non-interactive shell PATH; `rg` is unavailable, so repository discovery uses direct shell commands.
- Backend format initially failed on the new static retirement test; running Prettier on that file fixed it and backend format passed on rerun.

## Ready for Next Run
- Task 08 implementation and verification are complete; auto-commit was disabled, so the diff is left for manual review.
