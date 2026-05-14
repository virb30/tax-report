# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- Task 08 retired the active desktop distribution path: root runtime scripts/dependencies/configs and root `src` desktop code are no longer active product infrastructure. Backend and frontend project directories are now the only active runtime/build/test surfaces.

## Shared Decisions

- Task 02 moved backend containers to expose repositories/use cases/startup hooks without IPC registration; future Express routes should consume the `backend/src/*/infra/container` module outputs directly.
- Task 03 made backend startup require `TAX_REPORT_DATABASE_PATH`; the web runtime no longer creates a default SQLite path from Electron-style user data or project-local defaults.
- Task 03 established `backend/src/http` as the Express transport foundation. Future routes should register under the `/api` router, use transport-owned parsing/validation, return mapped JSON errors, and rely on the shared correlation/error middleware.
- Task 04 uses multipart field name `file` for uploaded CSV/XLSX files; transaction/consolidated import confirmation accept `assetTypeOverrides` as JSON text, and consolidated import also accepts `year`.
- Root `package.json` is repository metadata only after task 08. Do not reintroduce root runtime scripts, dependency management, workspaces, or build/test configuration for backend/frontend code.

## Shared Learnings

- Task 02 added `xlsx` to the backend project to preserve existing CSV/XLSX parser behavior after moving ingestion code; `npm audit` still reports one high-severity advisory for `xlsx` with no automatic fix.
- Task 04 added `multer` to the backend project for Express multipart uploads; temp files are stored under the OS temp directory and deleted when the HTTP response finishes.

## Open Risks

## Handoffs

- Task 05 moved the browser app into `frontend/src` and added a frontend-owned `TaxReportApi`/DTO boundary; future frontend work should keep using that boundary rather than importing backend contracts.
- Task 06 replaced the frontend Electron adapter with `frontend/src/services/api/http-tax-report-api.ts` plus `tax-report-api-provider.ts`; frontend tests should install API mocks with `setTaxReportApiForTesting`/`installTaxReportApiMock` rather than assigning browser globals.
