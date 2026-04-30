# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Rebuild the initial-balance renderer flow around grouped document APIs from task 07 so users can create, edit, replace, and delete one `ticker + year` document with multiple broker allocations.
- Keep the year-end positions table visible but separate from saved initial-balance documents.

## Important Decisions

- Use `AGENTS.md`, the PRD, techspec, and ADR-005 as the authoritative guidance set because `CLAUDE.md` is missing from the workspace.
- Keep the page as a composition root and move document loading, edit state, allocation row state, delete confirmation, and feedback handling into `useInitialBalance`.
- Keep saved initial-balance documents and year-end positions as separate tables on the page instead of reusing one ambiguous grid.

## Learnings

- The current renderer hook still saves a single allocation and does not load or delete saved initial-balance documents, so the rewrite must replace both state shape and screen composition.
- The first pass cleared `feedbackMessage` inside `resetEditor()`, which hid successful save feedback; the hook now supports resets that preserve messages after save/delete flows.

## Files / Surfaces

- `src/renderer/pages/InitialBalancePage.tsx`
- `src/renderer/pages/initial-balance-page/InitialBalanceDocumentsTable.tsx`
- `src/renderer/pages/initial-balance-page/use-initial-balance.ts`
- `src/renderer/pages/initial-balance-page/InitialBalanceForm.tsx`
- `src/renderer/pages/initial-balance-page/InitialBalancePositionsTable.tsx`
- `src/renderer/pages/InitialBalancePage.test.tsx`
- `src/renderer/App.e2e.test.tsx`

## Errors / Corrections

- `CLAUDE.md` does not exist at the repo root even though the task prompt references it.
- `npm run format` still fails at repo scope because hundreds of unrelated files are already out of Prettier compliance; task-local files were formatted and verified separately.
- A parallel `npm run lint` + `npm run package` rerun caused ESLint to hit a transient `src/renderer/.vite/...` file read during packaging; rerunning lint alone passed, so verification should stay serial when Vite package output is being regenerated.

## Ready for Next Run

- Verification evidence after the final code change:
  - `npx prettier --check` on touched task files passed.
  - `npm run lint` passed.
  - `npm test` passed with coverage `92.69%` statements, `80.55%` branches, `94.96%` functions, `92.93%` lines.
  - `npm run package` passed.
- Task tracking updated:
  - `task_08.md` marked `completed` and all subtasks/tests checked.
  - `_tasks.md` marked task 08 as `completed`.
