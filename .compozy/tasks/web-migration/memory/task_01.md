# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Create only independent project shells for `backend/` and `frontend/`; moving existing Electron `src/main` or `src/renderer` code remains out of scope.

## Important Decisions

- Keep root Electron project files transitional for now, but do not add npm workspaces or root scripts for backend/frontend.
- Use minimal project-local smoke source plus colocated Jest tests to prove independent TypeScript and TSX test discovery with coverage gates.
- Do not add `xlsx` to the new backend shell in task 01; it produced a high-severity audit advisory and no import parser code is being moved in this task.

## Learnings

- `CLAUDE.md` is listed in the task prompt but is not present at the repository root.
- `rg` is unavailable in this environment; use `rtk proxy find` or direct file reads for discovery.

## Files / Surfaces

- Added project-local shell files under `backend/` and `frontend/`.
- Updated root `README.md` and `.gitignore` for the independent shell layout.
- Updated root ESLint/Prettier ignores so transitional root commands do not own `backend/` or `frontend/` files.
- Applied Prettier-only formatting to five existing root `src/main/**` files that blocked `npm run format`.

## Errors / Corrections

- Corrected initial frontend smoke file names to kebab-case and registered Jest setup for `@testing-library/jest-dom`.
- Excluded `backend/` and `frontend/` from transitional root ESLint/Prettier ownership so local project commands own those files.
- First rerun of root `npm test` timed out in three existing renderer tests after a prior pass; rerunning root tests by themselves passed all suites.

## Ready for Next Run

- `backend/` and `frontend/` now have independent npm installs, local configs, local smoke tests, local coverage gates, and project-local README setup notes.
- Verification evidence from this run: backend and frontend `npm run build`, `npm run lint`, `npm run format`, `npm test`, and `npm audit --omit=dev` all exited 0; root `npm run lint`, `npm run format`, `npm test`, and explicit no-workspace check exited 0 after the Prettier cleanup and standalone test rerun.
