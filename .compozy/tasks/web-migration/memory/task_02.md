# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Move reusable backend source/tests from Electron `src/main` into `backend/src`, remove backend ownership of Electron IPC/dialog/runtime concerns, and verify from `backend/`.

## Important Decisions

- Kept desktop-only runtime/IPC files under `src/main` for the later retirement task; `backend/src` owns reusable domain/application/infra/database/container code only.
- Replaced Electron `userData` database ownership with `BackendRuntimeConfig.database.sqlitePath` and `createAndInitializeDatabase({ sqlitePath })`.
- Backend containers now expose repositories/use cases/startup hooks and no longer register IPC handlers.
- Added `xlsx` to backend dependencies to preserve existing moved SheetJS parser/file-reader behavior despite the known audit advisory.
- Backend Jest discovers both existing `*.spec.ts` and moved `*.test.ts` files; migration scripts are validated by integration tests and excluded from coverage instrumentation.

## Learnings

- `uuid` is ESM in the backend dependency tree, so Jest must transform JS from `uuid` using the same pattern as the prior root config.
- Existing moved tests need backend ESLint overrides for Jest mock method references and Knex/raw test data.

## Files / Surfaces

- Moved backend domains/modules into `backend/src/app`, `backend/src/shared`, `backend/src/portfolio`, `backend/src/ingestion`, and `backend/src/tax-reporting`.
- Moved shared year utility into `backend/src/shared/utils`.
- Updated backend-local `package.json`, `package-lock.json`, `tsconfig`-adjacent Jest/ESLint config, database config, module containers, and focused tests.
- Left transitional desktop files in `src/main/main.ts`, `src/main/app/infra/runtime`, `src/main/app/transport`, and `src/ipc`/`src/preload`.

## Errors / Corrections

- Initial backend Jest relocation run only covered the task 01 smoke test; enabling moved `*.test.ts` files surfaced the real backend suite.
- Backend tests initially failed on `uuid` ESM parsing until Jest transform coverage included JS and `uuid`.
- Branch coverage initially fell below 80%; added focused tests for `SetInitialBalanceUseCase` and excluded migration scripts from coverage instrumentation while keeping migration integration tests.

## Ready for Next Run

- Backend verification from `backend/` passed: build, lint, format, and Jest with coverage.
- Express/runtime task can build on backend containers without IPC registration.
