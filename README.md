# Tax Report

Tax Report is a browser-based web product for Brazilian individual investor tax
workflows. The repository orients around two independent projects:

- `backend/`: Express HTTP API, server-side SQLite persistence, backend tests,
  and backend runtime configuration.
- `frontend/`: React browser app, frontend-owned API client types, browser
  workflow tests, and frontend build configuration.

The repository root is for orientation, LLM workflow material, and migration
documentation. It is not a npm workspace, and backend/frontend dependencies,
scripts, TypeScript configuration, and source code belong inside their project
directories.

## Requirements

- Node.js `24.15.0` from `.nvmrc`
- npm `>=10`

Install dependencies independently:

```bash
nvm use
cd backend
npm install

cd ../frontend
npm install
```

## Project Entry Points

Use the project-local README before running project commands:

- [Backend project](backend/README.md)
- [Frontend project](frontend/README.md)

Common project checks:

```bash
cd backend
npm run lint
npm run build
npm run test

cd ../frontend
npm run lint
npm run build
npm run test
```

## Web Migration Sources

The web migration requirements and decisions live under
`.compozy/tasks/web-migration/`:

- [PRD](.compozy/tasks/web-migration/_prd.md)
- [TechSpec](.compozy/tasks/web-migration/_techspec.md)
- [ADR-001: Replace Desktop Distribution with a Web Product](.compozy/tasks/web-migration/adrs/adr-001.md)
- [ADR-003: Keep Server-Side SQLite for Phase 1](.compozy/tasks/web-migration/adrs/adr-003.md)
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](.compozy/tasks/web-migration/adrs/adr-006.md)
- [ADR-007: Split Backend and Frontend into Independent Projects](.compozy/tasks/web-migration/adrs/adr-007.md)

## Phase 1 Scope

Phase 1 preserves core workflow outcomes in the browser: import, initial
balance, positions, monthly tax, annual report, assets, and brokers. The web
product may change navigation and file import patterns to match browser
expectations.

Desktop data migration is out of scope for Phase 1. Offline-first operation is
also out of scope for Phase 1. Server-side SQLite remains the Phase 1 persistence
target and carries hosted concurrency and operational limits until a future
database migration is planned.

## Sensitive Data

Tax Report handles sensitive financial and tax data. Documentation, tests,
logs, screenshots, and support material must not expose uploaded CSV/XLSX
contents, parsed tax rows, CNPJ values, broker statements, portfolio positions,
or other financial data. Use synthetic data for examples and redact sensitive
values from errors and logs.

## Verification Gate

The web product readiness gate is:

- backend and frontend unit tests with coverage
- backend API integration tests for route validation, response mapping,
  multipart upload behavior, and consistent errors
- browser E2E workflow coverage for import, initial balance, positions, monthly
  tax, annual report, assets, and brokers

Targeted commands used while building the gate:

```bash
cd backend
npm run test -- --runTestsByPath src/http/routes/workflow-routes.integration.spec.ts --coverage=false

cd ../frontend
npm run test -- --runTestsByPath src/App.e2e.test.tsx --coverage=false
```

## Product Access

Use the backend and frontend project commands above for all active product work.
The repository root does not own runtime scripts, package installation, or build
configuration.
