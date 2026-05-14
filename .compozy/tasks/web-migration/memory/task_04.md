# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Expose every TechSpec Phase 1 HTTP endpoint under `backend/src/http`, using backend-owned validation/error mapping and existing backend use cases.
- Baseline before edits: `backend/src/http/routes/index.ts` only registers `/api/health`; core workflow endpoints are absent.

## Important Decisions

- Keep this task scoped to backend HTTP transport and tests; do not alter IPC contracts or frontend schemas.
- Added `multer` in the backend project for multipart transport parsing, with disk temp files cleaned on response finish.
- Multipart file validation now requires a supported extension and content sniffing for CSV/XLSX before use case execution.
- Plain application `Error`s thrown through HTTP routes are normalized to consistent JSON business/not-found responses by the route wrapper.

## Learnings

- `CLAUDE.md` is not present in the repository, so execution uses `AGENTS.md`, `.codex/RTK.md`, PRD/TechSpec/ADRs, and rule files as available guidance.
- `backend/src/http` integration tests can exercise route behavior with mocked module use cases through `createBackendApp` dependency overrides, avoiding a network listener.

## Files / Surfaces

- Expected primary surfaces: `backend/src/http/**`, `backend/src/http/app.ts`, backend package metadata if multipart dependencies are required, and focused backend HTTP tests.
- Touched surfaces: `backend/src/http/app.ts`, `backend/src/http/routes/**`, `backend/src/http/validation/**`, `backend/src/http/upload/**`, `backend/src/http/test/**`, `backend/package.json`, and `backend/package-lock.json`.

## Errors / Corrections

- Malformed JSON in multipart fields initially risked escaping as a parser exception; corrected `parseJsonField` to make malformed JSON fail normal Zod validation with `VALIDATION_ERROR`.

## Ready for Next Run

- Verification evidence from this run: `npm run build`, `npm run lint`, `npm run format`, and `npm test -- --runInBand` all exited 0 in `backend/`.
- Full Jest coverage after this task: statements 92.35%, branches 80.5%, functions 94.9%, lines 92.5%; 81 suites and 382 tests passed.
