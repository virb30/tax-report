---
status: completed
title: Expose Core Workflow HTTP API Routes
type: backend
complexity: critical
dependencies:
  - task_03
---

# Task 04: Expose Core Workflow HTTP API Routes

## Overview
Expose the complete Phase 1 backend API surface for the seven core workflows through Express routes. This includes brokers, assets, initial balance, positions, monthly tax, annual reports, transaction imports, consolidated position imports, and daily broker taxes.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST implement every endpoint listed in the TechSpec "API Endpoints" table.
2. MUST keep backend request validation and response mapping backend-owned.
3. MUST invoke existing application use cases through thin HTTP transport handlers.
4. MUST support multipart upload routes for transaction preview/confirm, daily broker tax import, consolidated position preview, and consolidated position import.
5. MUST validate uploaded file type and size without relying only on browser-provided filename or MIME type.
6. MUST return consistent HTTP error bodies for validation, not found, business, and unexpected failures.
7. SHOULD avoid logging uploaded contents, tax rows, CNPJ values, and sensitive financial data.
</requirements>

## Subtasks
- [x] 4.1 Add broker and asset HTTP routes.
- [x] 4.2 Add initial balance and positions HTTP routes.
- [x] 4.3 Add monthly tax and annual report HTTP routes.
- [x] 4.4 Add transaction import and daily broker tax multipart routes.
- [x] 4.5 Add consolidated position multipart preview and import routes.
- [x] 4.6 Add API integration tests for validation, response mapping, use case integration, and error shape.
- [x] 4.7 Add multipart tests for file type, size, success, validation failure, and cleanup behavior.

## Implementation Details
Follow the TechSpec "API Endpoints", "Core Interfaces", "Integration Points", and "Testing Approach" sections. Use the existing IPC contracts only as implementation references where useful; do not make IPC contracts the web API contract.

### Relevant Files
- `backend/src/portfolio/application/use-cases/list-brokers.use-case.ts` - source behavior for broker listing.
- `backend/src/portfolio/application/use-cases/create-broker.use-case.ts` - source behavior for broker creation.
- `backend/src/portfolio/application/use-cases/list-assets.use-case.ts` - source behavior for asset catalog listing.
- `backend/src/portfolio/application/use-cases/save-initial-balance-document.use-case.ts` - source behavior for initial balance save.
- `backend/src/portfolio/application/use-cases/list-positions.use-case.ts` - source behavior for positions.
- `backend/src/ingestion/application/use-cases/preview-import.use-case.ts` - source behavior for transaction preview.
- `backend/src/ingestion/application/use-cases/import-transactions.use-case.ts` - source behavior for transaction confirmation.
- `backend/src/tax-reporting/application/use-cases/generate-assets-report.use-case.ts` - source behavior for annual report output.

### Dependent Files
- `backend/src/http/**` - route modules, validators, upload middleware, and response mappers to create or extend.
- `backend/src/ingestion/application/interfaces/spreadsheet.file-reader.ts` - may need uploaded-buffer or temporary-file support.
- `backend/src/ingestion/infra/file-readers/sheetjs.spreadsheet.file-reader.ts` - must support browser upload inputs through backend transport.
- `backend/src/app/infra/container/types.ts` - may need exported use cases for HTTP route registration.
- `backend/src/**/infra/container/index.ts` - module exports may need to expose use cases used by routes.

### Related ADRs
- [ADR-002: Use React with an Express HTTP API](adrs/adr-002.md) - Requires HTTP routes that call existing backend use cases.
- [ADR-004: Keep Backend and Frontend Schemas Independent](adrs/adr-004.md) - Requires backend-owned validation and mapping.
- [ADR-005: Parse Browser File Uploads in the Backend](adrs/adr-005.md) - Requires multipart upload and backend parsing.
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](adrs/adr-006.md) - Requires API integration coverage for parity workflows.

## Deliverables
- HTTP routes for all TechSpec API endpoints.
- Backend-owned route validators and response mappers.
- Multipart upload handling for import and consolidated position flows.
- API integration tests covering each route family and error shape.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for core workflow HTTP APIs **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Broker route validation accepts valid create/update/toggle payloads and rejects missing IDs.
  - [x] Asset route validation rejects update requests without editable fields.
  - [x] Initial balance route validation rejects empty allocations and invalid year values.
  - [x] Position route validation rejects invalid year, ticker, and average-price fee mode values.
  - [x] Multipart validation rejects unsupported file extension and oversized upload inputs.
  - [x] Error mapper returns `error.code`, `error.message`, and safe `error.details` for known business errors.
- Integration tests:
  - [x] `GET/POST/PATCH /api/brokers` routes call broker use cases and return expected JSON.
  - [x] `GET/PATCH/POST /api/assets` routes call asset use cases and return expected JSON.
  - [x] `/api/initial-balances` and `/api/positions` routes preserve current initial balance and position outcomes.
  - [x] `/api/monthly-tax/*` and `/api/reports/assets` routes preserve current monthly tax and annual report outcomes.
  - [x] Transaction preview and confirm multipart routes parse CSV/XLSX uploads and return preview/import results.
  - [x] Daily broker tax and consolidated position multipart routes parse CSV/XLSX uploads and return import results.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- Every TechSpec endpoint is registered and integration-tested.
- Upload routes do not rely on local desktop file paths.
- HTTP errors are consistent across route families.
