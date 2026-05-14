# Tax Report Backend

Independent Express backend project for the Tax Report web product. The backend
owns HTTP routes, runtime configuration, server-side SQLite, backend tests, and
the ingestion/tax/portfolio use cases used by the browser app.

## Requirements

- Node.js `24.15.0` from the repository root `.nvmrc`
- npm `>=10`

## Setup

```bash
nvm use
cd backend
npm install
```

## Commands

- `npm run dev`: starts the backend with `ts-node src/main.ts`.
- `npm run db:init`: creates the configured SQLite file when needed and applies migrations/seeds.
- `npm run start`: starts the compiled backend entrypoint at `dist/main.js`.
- `npm run build`: type-checks backend TypeScript with no emit.
- `npm run lint`: runs ESLint with zero warnings allowed.
- `npm run format`: checks Prettier formatting.
- `npm run format:write`: writes Prettier formatting changes.
- `npm run test`: runs backend Jest tests with coverage.

## Runtime Configuration

The backend reads runtime configuration from `backend/.env` and allows process
environment variables to override those defaults:

- `DATABASE_PATH`: required SQLite database path. Relative paths are
  resolved from the backend process working directory.
- `PORT`: optional HTTP port, default `3000`.
- `NODE_ENV`: optional runtime environment, one of `development`, `test`, or
  `production`; defaults to `development`.
- `MAX_UPLOAD_BYTES`: optional maximum uploaded file size, default
  `10485760`.
- `MAX_UPLOAD_FILES`: optional maximum multipart file count, default
  `1`.

Example development start:

```bash
npm run dev
```

## HTTP API

Routes are registered under `/api`. The current surface includes health,
imports, daily broker taxes, initial balances, positions, monthly tax, annual
assets report, assets, and brokers.

Uploaded CSV/XLSX files use multipart field name `file`. Transaction import
confirmation accepts `assetTypeOverrides` as JSON text. Consolidated position
import accepts `year` and `assetTypeOverrides`.

API errors use JSON bodies with `error.code`, `error.message`, and optional
`error.details`. Request failure logs include route, method, status, error code,
and correlation ID.

## Phase 1 SQLite Constraints

SQLite is server-side in Phase 1. The browser does not own persistence, and the
database path is configured through backend environment variables.

Phase 1 keeps SQLite to reduce migration risk. This means hosted concurrency,
backup/restore, operational access, and PostgreSQL readiness remain constrained
until a later database initiative. Desktop data migration and offline-first
operation are out of scope for Phase 1.

## Privacy And Security

The backend handles sensitive financial and tax data. Do not log uploaded
CSV/XLSX contents, parsed tax rows, CNPJ values, broker statement contents,
portfolio positions, or other financial data. Keep examples synthetic and
redact sensitive values in error metadata, test fixtures, and support material.

Uploaded files are accepted only through browser multipart requests, validated by
the backend, and parsed by backend-owned ingestion logic. Temporary upload
handling must keep file count and file size limits enforced.

## Verification

Run the backend checks from `backend/`:

```bash
npm run lint
npm run build
npm run test
```

Targeted API integration verification:

```bash
npm run test -- --runTestsByPath src/http/routes/workflow-routes.integration.spec.ts --coverage=false
```

Before desktop distribution is retired, the backend must participate in the full
Phase 1 gate: unit tests with coverage, API integration tests for HTTP behavior,
and browser E2E coverage owned with the frontend.

## References

- [PRD](../.compozy/tasks/web-migration/_prd.md)
- [TechSpec](../.compozy/tasks/web-migration/_techspec.md)
- [ADR-003: Keep Server-Side SQLite for Phase 1](../.compozy/tasks/web-migration/adrs/adr-003.md)
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](../.compozy/tasks/web-migration/adrs/adr-006.md)
- [ADR-007: Split Backend and Frontend into Independent Projects](../.compozy/tasks/web-migration/adrs/adr-007.md)
