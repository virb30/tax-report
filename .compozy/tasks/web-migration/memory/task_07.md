# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Update root, backend, and frontend README files for the independent web product structure and Phase 1 documentation constraints.

## Important Decisions

- Added documentation verification tests under `backend/src/docs` and `frontend/src/docs` so each independent project validates its own README/scripts with its local Jest setup.
- Documented targeted verification commands as `npm run test -- --runTestsByPath ... --coverage=false` to avoid recursive documentation-test execution while still running real API/browser workflow tests.

## Learnings

- `CLAUDE.md` is not present in the repository; `AGENTS.md`, RTK, PRD, TechSpec, ADRs, and project package scripts provided the usable guidance.
- Backend runtime requires `TAX_REPORT_DATABASE_PATH`; frontend HTTP API defaults to `/api` through `HttpTaxReportApi`.
- Backend full Jest coverage after this task: statements 92.35%, branches 80.5%, functions 94.9%, lines 92.5%.
- Frontend full Jest coverage after this task: statements 87.74%, branches 80.15%, functions 91.31%, lines 87.72%.

## Files / Surfaces

- `README.md`
- `backend/README.md`
- `frontend/README.md`
- `backend/src/docs/readme-documentation.spec.ts`
- `frontend/src/docs/readme-documentation.test.ts`

## Errors / Corrections

- Initial `rtk rg` discovery failed because `rg` is not available; switched to `rtk proxy find`.
- Changed README test command references from `npm test` to `npm run test` so script-name checks match package scripts exactly.
- Fixed documentation test assertions to tolerate Markdown line wrapping and removed an unnecessary type assertion flagged by ESLint.

## Ready for Next Run

- Task implementation, validation, and self-review are complete; no cross-task memory promotion was needed.
