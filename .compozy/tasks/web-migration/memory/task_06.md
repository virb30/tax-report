# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Convert the active frontend from Electron IPC globals and desktop file paths to the frontend-owned `TaxReportApi` boundary backed by HTTP routes and browser `File` uploads.
- Verification scope includes frontend unit/API-client tests, browser-style workflow parity coverage, no active `window.electronApi` references, and the project validation commands supported by the split frontend/backend projects.

## Important Decisions

- `CLAUDE.md` was requested by the task brief but is absent from the repository and parent workspace; proceed with `AGENTS.md`, repository rules, PRD, TechSpec, ADRs, and task files.
- The web-migration ADRs supersede the legacy Electron rule that renderer/main communication should use IPC for this task; the target boundary is React -> frontend API service -> Express HTTP.
- The frontend API provider now owns a default `HttpTaxReportApi` instance and exposes `setTaxReportApiForTesting` so tests mock `TaxReportApi` directly without active `window.electronApi` globals.

## Learnings

- Shared memory says task 05 left `frontend/src/services/api/electron-tax-report-api.ts` delegating `TaxReportApi` to `window.electronApi`; task 06 must replace that adapter.
- Backend multipart routes use form field `file`; transaction/consolidated confirm routes accept `assetTypeOverrides` as JSON text, and consolidated import also accepts `year`.
- Pre-change frontend still contains active `window.electronApi` references in workflow hooks/pages/components, `vite-env.d.ts`, mocks, and browser-style tests.
- Post-change grep for `window.electronApi`, `importSelectFile`, desktop upload `filePath`, and `electron-tax-report-api` returns no frontend source matches.
- Frontend Jest coverage after conversion: 13 suites / 45 tests passing, global coverage 87.74% statements, 80.15% branches, 91.31% functions, 87.72% lines.
- Backend Jest coverage after frontend conversion: 81 suites / 382 tests passing, global coverage 92.35% statements, 80.5% branches, 94.9% functions, 92.5% lines.

## Files / Surfaces

- Planned frontend surfaces: `frontend/src/services/api/**`, `frontend/src/types/api.types.ts`, workflow hooks/pages under `frontend/src/pages/**`, `frontend/src/components/MigrateYearModal.tsx`, `frontend/src/test/**`, `frontend/src/vite-env.d.ts`, and workflow tests.
- Implemented surfaces include `frontend/src/services/api/http-tax-report-api.ts`, `tax-report-api-provider.ts`, `tax-report-api.ts`, `http-tax-report-api.test.ts`, browser file input changes in import pages/modals, workflow hook API conversions, API mock helper updates, and frontend workflow tests.

## Errors / Corrections

- Initial frontend validation failed because the new HTTP-client test expected lowercase `content-type`; corrected the assertion to the actual `Content-Type` header.
- Static checks then found a Jest generic overload issue and an async test response helper without `await`; fixed the fetch mock typing and response helper, then formatted the frontend project.

## Ready for Next Run

- No known task-local blockers after validation. Automatic commit is disabled; leave the diff for manual review.
