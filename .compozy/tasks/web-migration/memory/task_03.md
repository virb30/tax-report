# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Add backend Express runtime foundation for Task 03: app factory, startup entrypoint, runtime config, health route, error responses, request correlation, safe failure logging, and tests.

## Important Decisions

- Keep Task 03 scoped to HTTP runtime primitives and `/api/health`; core workflow routes remain for Task 04.
- Build the app factory with dependency overrides so integration tests can verify database and module startup behavior without binding a port or running full migrations.
- Runtime config now requires `TAX_REPORT_DATABASE_PATH`; the previous project-local default was removed to satisfy the task's explicit config validation requirement and ADR-003 server-owned SQLite path.
- `backend/src/app/infra/config/backend-runtime-config.ts` remains as a compatibility re-export, while canonical runtime config lives in `backend/src/app/infra/runtime/backend-runtime-config.ts`.

## Learnings

- `CLAUDE.md` is not present in the repository tree; loaded `AGENTS.md`, RTK, PRD, TechSpec, ADR-002/003/006, and backend/test/folder/code rules instead.
- Task 02 left backend module containers ready for direct composition: shared infrastructure feeds portfolio, ingestion, and tax-reporting modules, and startup hooks are idempotent.
- `supertest` was added as a backend dev dependency for Express API integration tests without binding a network listener.

## Files / Surfaces

- Touched backend surfaces: `backend/src/app/infra/runtime/**`, `backend/src/http/**`, `backend/src/main.ts`, `backend/package.json`, `backend/package-lock.json`, `backend/src/app/infra/config/backend-runtime-config.ts`, and `backend/src/app/infra/database/database.test.ts`.
- Added tests: runtime config unit tests, HTTP error mapper unit tests, safe logger unit tests, and Express app integration tests for health, 404 error shape, and database/module startup composition.

## Errors / Corrections

- `npm run format` initially failed on `src/http/errors/http-error-mapper.ts`; fixed with `npm run format:write` and reran the full backend gate.

## Verification

- `npm run format`: pass, all matched files use Prettier style.
- `npm run lint`: pass, ESLint zero warnings.
- `npm run build`: pass, `tsc -p tsconfig.json --noEmit`.
- `npm test -- --runInBand`: pass, 78 suites / 368 tests, global coverage 92.04% statements, 81.03% branches, 94.67% functions, 92.17% lines.

## Ready for Next Run

- Task 04 can add workflow routes by extending `backend/src/http/routes` and using the existing app factory, correlation middleware, error mapper, safe logger, and `HttpHandler` parse/execute boundary.
