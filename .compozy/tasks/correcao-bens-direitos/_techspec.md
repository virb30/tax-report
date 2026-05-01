# TechSpec: Bens e Direitos Correction

## Executive Summary

This implementation extends the current Electron main-process architecture instead of introducing a parallel subsystem. `ticker_data` becomes the canonical asset catalog, import preview/confirm contracts become the review boundary for asset-type resolution, initial balance remains transaction-driven, and annual report readiness is assembled on demand in the main process.

The primary technical trade-off is higher on-demand computation and broader contract churn in exchange for one authoritative flow. That trade keeps business rules in the main process, avoids persisted report snapshots, and reuses the existing repository, IPC, and recalculation patterns already present in the codebase.

## System Architecture

### Component Overview

**1. Asset Catalog**

- Responsibility: persist canonical ticker metadata for supported scope.
- Backing store: extend `ticker_data`.
- Main files affected:
  - `src/main/database/migrations/013-*.ts`
  - `src/main/domain/portfolio/entities/asset.entity.ts`
  - `src/main/application/repositories/asset.repository.ts`
  - `src/main/infrastructure/repositories/knex-asset.repository.ts`
- PRD mapping:
  - “Asset Type Resolution and Review”
  - “Asset Catalog Maintenance for Annual Reporting”
  - “Legacy Asset Type Repair”

**2. Import Review Pipeline**

- Responsibility: parse input, resolve type, classify unsupported rows, return reviewable preview, accept confirmation overrides.
- Existing anchors:
  - `CsvXlsxTransactionParser`
  - `PreviewImportUseCase`
  - `ImportTransactionsUseCase`
  - `ImportConsolidatedPositionUseCase`
- New main-process services:
  - `AssetTypeResolverService`
  - `UnsupportedImportClassifier`
- PRD mapping:
  - “Asset Type Resolution and Review”
  - “Partial Workflow for Unsupported Lines”
  - “Explicit Scope Communication”

**3. Initial Balance Document Flow**

- Responsibility: save, list, edit, and delete multi-broker initial balances as replace-all `initial_balance` transactions per `ticker + year`.
- Existing anchors:
  - `SetInitialBalanceUseCase`
  - `TransactionRepository.deleteInitialBalanceByTickerAndYear`
- New application flow:
  - `SaveInitialBalanceDocumentUseCase`
  - `ListInitialBalanceDocumentsUseCase`
  - `DeleteInitialBalanceDocumentUseCase`
- PRD mapping:
  - “Editable Multi-Broker Initial Balance”

**4. Legacy Repair and Reprocessing**

- Responsibility: update canonical type for one ticker, derive affected years from history, recalculate and resave those years explicitly.
- Existing anchors:
  - `RecalculatePositionUseCase`
  - `PositionCalculatorService`
  - `TransactionRepository.findByTicker`
- New application flow:
  - `RepairAssetTypeUseCase`
  - `ReprocessTickerYearsService`
- PRD mapping:
  - “Legacy Asset Type Repair”

**5. Annual Report Assembly**

- Responsibility: build one declaration item per `ticker + assetType`, compute prior-year/current-year values, eligibility, pending issues, copy readiness, and broker summary.
- Existing anchors:
  - `GenerateAssetsReportUseCase`
  - `ReportGenerator`
- New main-process services:
  - `AnnualAssetsReportAssembler`
  - `DeclarationEligibilityService`
  - `HistoricalPositionService`
- PRD mapping:
  - “Declaration-Oriented Annual Report”
  - “Eligibility and Status Engine”

**6. Renderer Surfaces**

- `ImportPage`: add unresolved/unsupported review state to the existing preview section.
- `ImportConsolidatedPositionModal`: same review semantics as transaction import.
- `InitialBalancePage`: switch from single-broker form to document editor plus saved-documents table.
- `ReportPage`: render status-first declaration items instead of broker-flattened rows.
- New `AssetsPage`: follow the `BrokersPage` pattern for catalog maintenance.

### Data Flow

**Transaction import**

1. Renderer calls preview IPC with `filePath`.
2. Parser normalizes rows.
3. Resolver derives `assetType`, status, and unsupported flags.
4. Preview returns rows, pending summary, and required overrides.
5. Renderer sends confirm with `filePath` + `assetTypeOverrides`.
6. Main process persists accepted catalog updates first, then saves supported transactions, then publishes recalculation events.

**Consolidated position import**

1. Same preview/confirm pattern as transactions.
2. Confirm deletes existing `initial_balance` transactions for each `ticker + year`.
3. Confirm recreates allocations as `initial_balance` transactions.
4. Recalculation runs through existing queue/event flow.

**Annual report**

1. Renderer requests `baseYear`.
2. Assembler loads current-year positions, relevant catalog entries, brokers, and per-ticker history.
3. Services compute previous-year value, current-year value, eligibility, pending issues, and copy readiness.
4. IPC returns final declaration items with no renderer-side business-rule derivation.

## Implementation Design

### Core Interfaces

Conceptual contract sketch for the primary resolution boundary, implemented in TypeScript:

```go
type AssetTypeResolver interface {
    Resolve(input ResolutionInput) (ResolvedAssetType, error)
}

type ResolvedAssetType struct {
    AssetType   string
    Status      string
    NeedsReview bool
    Unsupported string
}
```

```ts
export type SaveInitialBalanceDocumentCommand = {
  ticker: string;
  year: number;
  assetType: AssetType;
  averagePrice: number;
  allocations: Array<{ brokerId: string; quantity: number }>;
};
```

```ts
export interface AssetsReportItem {
  ticker: string;
  assetType: AssetType;
  previousYearValue: number;
  currentYearValue: number;
  status: ReportItemStatus;
  pendingIssues: PendingIssue[];
  canCopy: boolean;
  description?: string;
}
```

### Data Models

**Database**

- Add migration `013-*` after `012-add-active-to-brokers`.
- Extend `ticker_data`:
  - `ticker text primary key`
  - `asset_type text null`
  - `resolution_source text null`
  - `cnpj text null`
  - `name text null`
- No new table for unsupported import issues.
- No new table for initial-balance documents.

**Domain / shared enums**

- `AssetTypeSource = 'file' | 'manual'`
- `AssetResolutionStatus = 'resolved_from_file' | 'resolved_from_catalog' | 'manual_override' | 'unresolved'`
- `ReportItemStatus = 'required' | 'optional' | 'below_threshold' | 'pending' | 'unsupported'`
- `PendingIssueCode = 'missing_asset_type' | 'missing_issuer_name' | 'missing_issuer_cnpj' | 'unsupported_row' | 'unsupported_scope'`

**Catalog read model**

- `AssetCatalogItem`
  - `ticker`
  - `assetType | null`
  - `resolutionSource | null`
  - `name | null`
  - `cnpj | null`
  - `isReportReadyMetadata: boolean`

**Import preview DTOs**

- Extend transaction preview rows with:
  - `resolvedAssetType | null`
  - `resolutionStatus`
  - `needsReview`
  - `unsupportedReason | null`
- Extend consolidated preview rows with the same fields.
- Add `summary`:
  - `supportedRows`
  - `pendingRows`
  - `unsupportedRows`

**Import confirm DTOs**

- `assetTypeOverrides: Array<{ ticker: string; assetType: AssetType }>` for both transaction and consolidated flows.

**Initial balance document DTOs**

- `InitialBalanceDocument`
  - `ticker`
  - `year`
  - `assetType`
  - `averagePrice`
  - `allocations[]`
  - `totalQuantity`

**Report DTO**

- Replace broker-flattened output with declaration-item output:
  - `revenueClassification`
  - `previousYearValue`
  - `currentYearValue`
  - `acquiredInYear`
  - `status`
  - `eligibilityReason`
  - `pendingIssues[]`
  - `canCopy`
  - `description | null`
  - `brokersSummary[]`

### API Endpoints

This app uses typed IPC contracts, not HTTP routes.

| IPC channel / API                                                            | Action   | Request                                    | Response                                                        |
| ---------------------------------------------------------------------------- | -------- | ------------------------------------------ | --------------------------------------------------------------- |
| `import:preview-transactions` / `previewImportTransactions`                  | Modified | `{ filePath }`                             | preview rows + resolution fields + unsupported summary          |
| `import:confirm-transactions` / `confirmImportTransactions`                  | Modified | `{ filePath, assetTypeOverrides[] }`       | imported count, recalculated tickers, skipped unsupported count |
| `portfolio:preview-consolidated-position` / `previewConsolidatedPosition`    | Modified | `{ filePath }`                             | preview rows + resolution fields + unsupported summary          |
| `portfolio:import-consolidated-position` / `importConsolidatedPosition`      | Modified | `{ filePath, year, assetTypeOverrides[] }` | imported count, recalculated tickers, skipped unsupported count |
| `assets:list` / `listAssets`                                                 | New      | `{ pendingOnly?, reportBlockingOnly? }`    | catalog items                                                   |
| `assets:update` / `updateAsset`                                              | New      | `{ ticker, assetType?, name?, cnpj? }`     | updated catalog item                                            |
| `assets:repair-type` / `repairAssetType`                                     | New      | `{ ticker, assetType }`                    | affected years + reprocessed count                              |
| `portfolio:save-initial-balance-document` / `saveInitialBalanceDocument`     | New      | document payload                           | saved document summary                                          |
| `portfolio:list-initial-balance-documents` / `listInitialBalanceDocuments`   | New      | `{ year }`                                 | document list with allocations                                  |
| `portfolio:delete-initial-balance-document` / `deleteInitialBalanceDocument` | New      | `{ ticker, year }`                         | deleted flag                                                    |
| `report:assets-annual` / `generateAssetsReport`                              | Modified | `{ baseYear }`                             | declaration items with statuses and pending issues              |

## Integration Points

No new external service integrations are introduced in this MVP.

Existing local boundaries remain:

- Electron file picker via `dialog.showOpenDialog`
- local CSV/XLSX parsing via existing parser adapters
- clipboard copy in renderer for ready report items

## Impact Analysis

| Component                                                | Impact Type         | Description and Risk                                                  | Required Action                                                                      |
| -------------------------------------------------------- | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/main/database/migrations`                           | modified            | Medium risk schema change to `ticker_data`                            | add migration 013 and update in-memory DB tests                                      |
| `src/main/domain/portfolio/entities/asset.entity.ts`     | modified            | Medium risk because current `Cnpj` assumption becomes nullable        | expand entity and invariants                                                         |
| `src/main/application/repositories/asset.repository.ts`  | modified            | Medium risk contract expansion                                        | add find-by-ticker, list/filter, update methods                                      |
| `src/main/application/use-cases/import-*`                | modified            | High risk because preview/confirm contracts and logic both change     | add resolver/classifier flow and override persistence                                |
| `src/main/application/use-cases/set-initial-balance`     | deprecated/replaced | High risk semantic shift from single-row save to document replacement | replace with document-oriented use cases                                             |
| `src/main/application/use-cases/generate-asset-report`   | modified            | High risk output contract rewrite                                     | introduce assembler and eligibility services                                         |
| `src/main/ipc/registrars` and `src/shared/ipc/contracts` | modified/new        | High risk cross-process typing changes                                | add assets registrar/contracts and update existing import/report/portfolio contracts |
| `src/renderer/pages/*`                                   | modified/new        | Medium risk UI churn across four surfaces                             | add assets page, import review UI, report statuses, initial-balance doc editor       |

## Testing Approach

### Unit Tests

- Characterize current failure modes first:
  - fallback to `stock`
  - report split by broker
  - single-broker initial balance overwrite
- Add focused unit tests for:
  - `AssetTypeResolverService` precedence: file > catalog > manual override
  - unsupported-line classification
  - declaration eligibility thresholds by asset type
  - pending-issue generation
  - initial-balance document grouping/replacement
  - repair year derivation and reprocessing order

### Integration Tests

- Repository integration:
  - `KnexAssetRepository` with nullable metadata and type provenance
  - transaction replacement for initial-balance documents
- IPC integration:
  - import preview/confirm with overrides
  - assets catalog list/update/repair
  - initial-balance document save/list/delete
  - report generation with statuses and pending issues
- Renderer tests:
  - `ImportPage` review and confirm state
  - `ImportConsolidatedPositionModal` unresolved/unsupported handling
  - `InitialBalancePage` edit/delete document flow
  - `ReportPage` ready vs pending vs unsupported rendering
  - `AssetsPage` pending filter and update modal
- Keep end-to-end coverage targeted, not broad:
  - one supported mixed import
  - one legacy type repair
  - one report with pending metadata

## Development Sequencing

### Build Order

1. Add migration 013 and shared enum/type additions. No dependencies.
2. Extend `Asset` entity, `AssetRepository`, and `KnexAssetRepository`. Depends on step 1.
3. Add asset-catalog IPC/contracts/use cases and renderer `AssetsPage`. Depends on step 2.
4. Add `AssetTypeResolverService` and extend transaction/consolidated preview contracts. Depends on steps 2 and 3.
5. Extend import confirm flows to accept overrides and persist catalog updates before saving supported data. Depends on step 4.
6. Replace single-broker initial balance with document-oriented save/list/delete flows. Depends on steps 1 and 2.
7. Add legacy repair and year reprocessing use cases. Depends on steps 2, 5, and 6.
8. Replace current annual report generator with on-demand declaration-item assembler and new report contract. Depends on steps 2 and 7.
9. Update renderer report/import/initial-balance flows to new contracts and states. Depends on steps 3, 5, 6, and 8.
10. Add characterization, unit, integration, and renderer regression tests. Depends on steps 1 through 9.

### Technical Dependencies

- Migration 013 must land before any repository or integration test updates.
- Shared IPC contract changes must land before preload and renderer typing compiles.
- Repair use cases depend on a stable canonical asset type in the catalog.
- No external services or third-party infrastructure changes are required.

## Monitoring and Observability

- This desktop app has no external alerting stack in the MVP.
- Add structured main-process logs for:
  - `import.preview.summary`
  - `import.confirm.summary`
  - `asset.catalog.updated`
  - `asset.type.repair.completed`
  - `initial_balance.document.replaced`
  - `report.generate.summary`
- Recommended fields:
  - `ticker`
  - `year`
  - `affectedYears`
  - `supportedRows`
  - `pendingRows`
  - `unsupportedRows`
  - `readyItems`
  - `pendingItems`
  - `durationMs`
- Use logs for manual diagnostics and test assertions only; no production alert thresholds are required in this MVP.

## Technical Considerations

### Key Decisions

- Keep `ticker_data` as the single persisted asset catalog instead of adding a second table.
- Keep import review inside the existing preview/confirm contract pattern instead of forcing out-of-band catalog edits.
- Keep `transactions` as the source of truth for initial balance and model edits as replace-all per `ticker + year`.
- Compute annual report status on demand in the main process instead of persisting snapshots or deriving rules in the renderer.
- Keep unsupported-line handling ephemeral in the MVP instead of introducing a durable issues store.

### Known Risks

- Nullable issuer metadata changes may ripple into `Asset` and existing repository tests.
  - Mitigation: update domain/entity contracts first and characterize current assumptions.
- Import contract expansion may break renderer and preload typing in multiple places at once.
  - Mitigation: change shared contracts before touching handlers and renderer hooks.
- Historical reprocessing could be slow for tickers with long histories.
  - Mitigation: scope repair to affected ticker-years only and process years in ascending order.
- Replacing the report contract is high-churn because the renderer currently flattens broker allocations directly.
  - Mitigation: introduce the new declaration-item contract in main first, then swap the renderer table in one pass.

## Architecture Decision Records

- [ADR-001: Adopt an End-to-End Correction MVP for Bens e Direitos](adrs/adr-001.md) — Chooses a coherent MVP spanning import, maintenance, report, and initial-balance flows.
- [ADR-002: Continue with Supported Data and Surface Unsupported Lines as Pending Work](adrs/adr-002.md) — Keeps partial progress for supported holdings while blocking copy for incomplete output.
- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Uses one catalog for supported asset type, issuer metadata, and resolution provenance.
- [ADR-004: Use Preview-Confirm Contracts as the Import Review Boundary](adrs/adr-004.md) — Keeps manual review inside existing typed import flows.
- [ADR-005: Model Editable Initial Balance as Replace-All `initial_balance` Transactions per `ticker + year`](adrs/adr-005.md) — Preserves transaction-driven recalculation while enabling edit and delete semantics.
- [ADR-006: Assemble Annual Report Status On Demand and Reprocess Legacy Data Explicitly](adrs/adr-006.md) — Centralizes declaration-item logic in the main process and avoids persisted report snapshots.
- [ADR-007: Keep Unsupported Import Issues Ephemeral in the MVP](adrs/adr-007.md) — Shows unsupported lines during import without adding a durable issues store.
