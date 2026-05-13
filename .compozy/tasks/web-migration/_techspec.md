# Web Migration TechSpec

## Executive Summary

Tax Report will migrate from Electron to a React browser client backed by an Express HTTP API. Backend and frontend will
be reorganized as independent projects, not as a monorepo workspace. The repository root will keep only LLM rules,
skills, README, workflow docs, and general orientation.

The primary trade-off is migration control over long-term scalability. Phase 1 keeps server-side SQLite and independent
frontend/backend schemas to reduce runtime migration risk, while PostgreSQL and deeper backend/frontend separation can
evolve later.

## System Architecture

### Component Overview

| Component | Responsibility | Boundary |
|-----------|----------------|----------|
| `frontend/` | React browser app, frontend dependencies, frontend tests, frontend config | No backend imports |
| `backend/` | Express API, backend dependencies, backend tests, backend config | No frontend imports |
| Renderer API services | Frontend-owned HTTP client types and calls | Replace `window.electronApi` |
| HTTP route handlers | Validate requests, map uploads/errors, call use cases | Transport only |
| Application use cases | Preserve workflow behavior | No Express dependency |
| Knex repositories | Persist through server-side SQLite | Backend only |
| Root docs/rules | LLM instructions, README, workflow/task docs | No project runtime config |

Data flow: browser UI calls frontend API services, services call Express routes, routes validate HTTP input and call
backend use cases, use cases call repositories/domain services, repositories persist through SQLite, and routes return
frontend-consumable JSON.

Electron IPC, preload, BrowserWindow, and desktop file paths are not part of the web runtime.

## Implementation Design

### Project Structure and Documentation

The migrated repository must not be treated as a monorepo. Do not use root workspaces, shared root dependency
management, root project scripts, or shared root TypeScript configuration for backend/frontend runtime code.

Target structure:

```text
/
  AGENTS.md
  README.md
  .agents/
  .codex/
  .compozy/
  backend/
    package.json
    node_modules/
    tsconfig.json
    src/
  frontend/
    package.json
    node_modules/
    tsconfig.json
    src/
```

Backend-specific code, configuration, scripts, tests, docs, and dependencies live under `backend/`. Frontend-specific
code, configuration, scripts, tests, docs, and dependencies live under `frontend/`.

All source code inside each project must live under that project's `src` directory, for example `backend/src/...` and
`frontend/src/...`.

The root README should explain repository purpose and how to enter each project. Backend/frontend implementation details
belong in project-local docs such as `backend/README.md` and `frontend/README.md`.

### Core Interfaces

The implementation is TypeScript, but this Go-style interface captures the HTTP boundary:

```go
type WebRoute[Request any, Response any] interface {
	Method() string
	Path() string
	Validate(input any) (Request, error)
	Handle(ctx Context, input Request) (Response, error)
}
```

TypeScript route handlers should keep parsing separate from use case execution:

```ts
export interface HttpHandler<TInput, TOutput> {
  parse(input: unknown): TInput;
  execute(input: TInput): Promise<TOutput>;
}
```

Frontend code depends on frontend-owned API services:

```ts
export interface TaxReportApi {
  listBrokers(input?: ListBrokersRequest): Promise<ListBrokersResponse>;
  previewTransactionImport(input: FileUploadRequest): Promise<ImportPreviewResponse>;
  confirmTransactionImport(input: ConfirmImportRequest): Promise<ConfirmImportResponse>;
}
```

### Data Models

No new fiscal domain entities are required. The backend reuses existing concepts for brokers, assets, positions,
transactions, transaction fees, daily broker taxes, monthly tax closes, reports, and imports.

Backend request validation is backend-owned. Frontend request/response types are frontend-owned. The frontend must not
import backend Zod schemas or backend DTOs.

SQLite remains the Phase 1 backend persistence target. The database path comes from backend configuration, not Electron
`userData`.

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/import/transactions/preview` | Multipart transaction preview |
| POST | `/api/import/transactions/confirm` | Multipart transaction confirmation |
| GET/POST | `/api/daily-broker-taxes` | List or save daily broker taxes |
| POST | `/api/daily-broker-taxes/import` | Multipart daily broker tax import |
| DELETE | `/api/daily-broker-taxes/:date/:brokerId` | Delete daily broker tax |
| GET/POST | `/api/initial-balances` | List or save initial balances |
| DELETE | `/api/initial-balances/:year/:ticker` | Delete initial balance |
| GET/DELETE | `/api/positions` | List or delete positions by year |
| POST | `/api/positions/recalculate` | Recalculate position |
| POST | `/api/positions/migrate-year` | Migrate year |
| POST | `/api/positions/consolidated-preview` | Multipart consolidated position preview |
| POST | `/api/positions/consolidated-import` | Multipart consolidated position import |
| GET | `/api/monthly-tax/history` | Monthly tax history |
| GET | `/api/monthly-tax/months/:month` | Monthly tax detail |
| POST | `/api/monthly-tax/recalculate` | Recalculate monthly tax |
| GET | `/api/reports/assets` | Annual assets report |
| GET/PATCH | `/api/assets` and `/api/assets/:ticker` | List or update assets |
| POST | `/api/assets/:ticker/repair-type` | Repair asset type |
| GET/POST | `/api/brokers` | List or create brokers |
| PATCH | `/api/brokers/:id` | Update broker |
| POST | `/api/brokers/:id/toggle-active` | Toggle broker active state |

HTTP errors use consistent JSON bodies with `error.code`, `error.message`, and optional `error.details`.

## Integration Points

No third-party external services are required in Phase 1.

SQLite is a backend deployment dependency configured inside `backend/`. Browser imports use multipart upload. The
backend validates file type and size, parses CSV/XLSX, and avoids logging sensitive financial data.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| Root project files | Modified | Current root has project-specific config | Move backend/frontend config into project folders |
| `backend/` | New | Owns Express, SQLite, migrations, use cases, tests | Create independent backend project |
| `frontend/` | New | Owns React, UI tests, build config | Create independent frontend project |
| `src/main/**` | Moved | Backend logic currently under root `src` | Move into `backend/src` |
| `src/renderer/**` | Moved | Frontend currently depends on Electron API | Move into `frontend/src` and add HTTP services |
| `src/ipc/**` | Deprecated for web | IPC is Electron-specific | Do not use as web API contract |
| Import parser/file reader | Modified | Local file paths do not work in browser | Support uploaded file input |
| Tests | Modified | Current tests assume one project and Electron API mocks | Split backend/frontend tests and add API/E2E coverage |

## Testing Approach

### Unit Tests

Keep backend unit tests for domain, use cases, parsers, repositories, and HTTP handlers. Keep frontend component and
hook tests inside `frontend/`. Replace Electron API mocks with frontend API service mocks.

### Integration Tests

Add backend API integration tests against the Express app. Cover route validation, response mapping, use case
integration, multipart upload parsing, and consistent HTTP error shape.

### Browser E2E Tests

Add browser E2E coverage for import, initial balance, positions, monthly tax, annual report, assets, and brokers before
desktop replacement. Prefer Playwright for modern browser validation.

## Development Sequencing

### Build Order

1. Create `backend/` and `frontend/` independent project shells - no dependencies.
2. Move backend source/config/tests into `backend/src` and backend project config - depends on step 1.
3. Move frontend source/config/tests into `frontend/src` and frontend project config - depends on step 1.
4. Add frontend API service interface around the current Electron-backed API behavior - depends on step 3.
5. Migrate frontend hooks/pages to the API service interface - depends on step 4.
6. Add Express app, backend runtime config, and SQLite path config - depends on step 2.
7. Add non-file HTTP routes for brokers, assets, positions, initial balance, monthly tax, and reports - depends on step
   6.
8. Add multipart upload routes for imports - depends on steps 6 and 7.
9. Add frontend HTTP API implementation with independent types - depends on steps 5, 7, and 8.
10. Add backend API integration tests and frontend browser E2E tests - depends on steps 7, 8, and 9.
11. Stop desktop distribution work after the parity gate passes - depends on step 10.

### Technical Dependencies

Backend: Express, multipart middleware such as Multer, Knex, `better-sqlite3`, Jest or equivalent backend test setup.

Frontend: React, Vite, frontend test tooling, browser E2E runner.

Root: no backend/frontend package manager workspace, dependency tree, test runner, TypeScript config, or runtime build
scripts.

## Monitoring and Observability

Log backend request failures with route, method, status, error code, and correlation ID. Do not log uploaded contents,
tax rows, CNPJ values, or sensitive financial data.

Track import row counts, accepted/rejected rows, duration, monthly tax recalculation duration, and workflow completion
events.

## Technical Considerations

### Key Decisions

Use React with Express HTTP API to reuse backend use cases while removing Electron IPC.

Keep server-side SQLite in Phase 1 to avoid combining runtime migration with database migration.

Keep backend and frontend schemas independent so the projects can evolve separately.

Parse uploads in the backend to keep ingestion logic authoritative.

Split backend and frontend into independent projects, not a monorepo, with all source code under project-local `src`.

Require unit, API integration, and browser E2E verification before desktop replacement.

### Known Risks

SQLite may limit hosted concurrency. Mitigation: document Phase 1 constraints and defer PostgreSQL migration.

Independent schemas may drift. Mitigation: use API integration tests and browser E2E workflow tests.

Project restructuring can break imports and test paths. Mitigation: sequence moves before behavior changes and keep
source under `backend/src` or `frontend/src`.

Multipart uploads can leak sensitive data through temp files or logs. Mitigation: enforce limits, validate content,
clean temporary files, and redact logs.

## Architecture Decision Records

- [ADR-001: Replace Desktop Distribution with a Web Product](adrs/adr-001.md) - Selects web replacement with core workflow parity.
- [ADR-002: Use React with an Express HTTP API](adrs/adr-002.md) - Selects React plus Express HTTP.
- [ADR-003: Keep Server-Side SQLite for Phase 1](adrs/adr-003.md) - Keeps SQLite and defers PostgreSQL.
- [ADR-004: Keep Backend and Frontend Schemas Independent](adrs/adr-004.md) - Avoids shared frontend/backend schema packages.
- [ADR-005: Parse Browser File Uploads in the Backend](adrs/adr-005.md) - Uses multipart upload and backend parsing.
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](adrs/adr-006.md) - Defines the verification gate.
- [ADR-007: Split Backend and Frontend into Independent Projects](adrs/adr-007.md) - Requires independent `backend/` and `frontend/` projects.
