# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Move the existing React renderer from `src/renderer` into the independent `frontend/src` project.
- Define frontend-owned API/DTO types and mocks while preserving current `window.electronApi` behavior until task 06 rewires calls to HTTP.

## Important Decisions

- Keep task 05 as a structural/API-boundary move only; the API implementation may delegate to `window.electronApi` temporarily, but frontend source must not import `src/ipc`, preload, backend, or backend schemas.
- Added a frontend-owned `TaxReportApi` interface and DTO mirror under `frontend/src`; the temporary adapter is `getTaxReportApi()` and delegates to `window.electronApi` until task 06 replaces it with HTTP.
- Frontend coverage excludes non-runtime entry/test/type surfaces (`main.tsx`, `src/test/**`, `src/types/**`, declarations) while enforcing 80% global thresholds on production UI code.

## Learnings

- `frontend/` already exists from task 01 with smoke-only source/config; the real app and tests are still under `src/renderer`.
- `CLAUDE.md` is not present at the repository root despite the task instruction to read it.
- Existing renderer tests did not include broker page or daily broker tax coverage; task 05 added focused frontend tests for those workflows to keep moved frontend coverage above 80%.

## Files / Surfaces

- Planned surfaces: `frontend/src/**`, `frontend/package.json`, frontend config files, moved renderer source/tests, and task tracking files after verification.
- Touched surfaces: moved renderer files to `frontend/src`, added `frontend/src/services/api/**`, `frontend/src/types/api.types.ts`, `frontend/src/test/create-tax-report-api-mock.ts`, `frontend/src/utils/year.ts`, `frontend/vite.config.ts`, `frontend/tailwind.config.ts`, `frontend/postcss.config.cjs`, `frontend/components.json`, and updated frontend package/config/test files.

## Errors / Corrections

- Initial frontend test run passed moved tests but failed coverage at 75.89% statements / 72.49% branches; corrected by excluding non-runtime collection targets and adding brokers/daily-broker-tax tests.
- Initial frontend lint failed on migrated test mock patterns; corrected by making the frontend test lint override match the existing Jest mock style while preserving zero-warning lint.

## Ready for Next Run

- Verification evidence from task 05: `npm run format`, `npm run lint`, `npm test`, and `npm run build` all pass from `frontend/`.
