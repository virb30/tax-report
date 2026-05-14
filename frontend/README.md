# Tax Report Frontend

Independent React browser frontend project for the Tax Report web product. The
frontend owns browser UI code, frontend tests, Vite build configuration, and its
own API client types. It must not import backend schemas or backend DTOs.

## Requirements

- Node.js `24.15.0` from the repository root `.nvmrc`
- npm `>=10`

## Setup

```bash
nvm use
cd frontend
npm install
```

## Commands

- `npm run dev`: starts the Vite browser development server for the frontend.
- `npm run build`: type-checks frontend TypeScript/TSX and creates the Vite
  browser build.
- `npm run lint`: runs ESLint with zero warnings allowed.
- `npm run format`: checks Prettier formatting.
- `npm run format:write`: writes Prettier formatting changes.
- `npm run test`: runs frontend Jest tests with coverage.

## API Configuration

The frontend HTTP client defaults to `/api`, matching the backend route prefix.
Tests can inject a `TaxReportApi` through `setTaxReportApiForTesting`; production
code should use the provider instead of assigning browser globals.

When the frontend and backend are served from different origins, configure the
serving layer or future runtime wiring so browser requests still reach the
backend `/api` surface. Keep request and response types frontend-owned.

## Browser Workflows

The browser app must support import, initial balance, positions, monthly tax,
annual report, assets, and brokers before desktop distribution is retired.
Imports use browser file selection and multipart upload instead of desktop file
paths. Users must be able to preview, review, and confirm uploaded CSV/XLSX data
before it affects reports.

Desktop data migration is out of scope for Phase 1. Offline-first operation is
also out of scope for Phase 1. Persistence is owned by the backend through
server-side SQLite.

## Privacy And Security

The frontend handles sensitive financial and tax data in browser memory and UI
state. Do not place uploaded CSV/XLSX contents, parsed tax rows, CNPJ values,
broker statement contents, portfolio positions, or other financial data in
console logs, screenshots, analytics, fixtures, or user-facing examples. Use
synthetic examples and redact sensitive values in diagnostics.

## Verification

Run the frontend checks from `frontend/`:

```bash
npm run lint
npm run build
npm run test
```

Targeted browser workflow verification:

```bash
npm run test -- --runTestsByPath src/App.e2e.test.tsx --coverage=false
```

Before desktop distribution is retired, the frontend must participate in the
full Phase 1 gate: unit tests with coverage, API integration verification with
the backend, and browser E2E coverage for import, initial balance, positions,
monthly tax, annual report, assets, and brokers.

## References

- [PRD](../.compozy/tasks/web-migration/_prd.md)
- [TechSpec](../.compozy/tasks/web-migration/_techspec.md)
- [ADR-001: Replace Desktop Distribution with a Web Product](../.compozy/tasks/web-migration/adrs/adr-001.md)
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](../.compozy/tasks/web-migration/adrs/adr-006.md)
- [ADR-007: Split Backend and Frontend into Independent Projects](../.compozy/tasks/web-migration/adrs/adr-007.md)
