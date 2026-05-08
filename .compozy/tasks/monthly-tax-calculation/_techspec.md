# Monthly Tax Calculation

## Executive Summary

This feature extends `src/main/tax-reporting` with a first-class monthly close pipeline that reads canonical portfolio
facts, replays transactions month by month, persists one derived artifact per month in `monthly_tax_closes`, and
serves the renderer through three coarse IPC contracts. It maps the PRD sections `Core Features`, `User Experience`,
and `High-Level Technical Constraints` to a dedicated Monthly Tax workspace, fixed groups (`Geral - Comum`,
`Geral - Isento`, `FII`), a persisted audit trail, blocked-month guidance, and full-history recalculation.

The main trade-off is explicit: V1 adds derived persistence, queue-driven recalculation, and one new renderer
navigation seam in exchange for fast history loading, stable month detail, and automatic refresh after upstream fixes.
Rule defaults in this draft stay aligned with the official Receita references already used in the PRD for month-by-month
apuracao, common-operation IRRF, stock-sale exemption up to BRL 20,000, FII taxation, and sub-BRL 10 carry-forward.

## System Architecture

### Component Overview

Main components, their responsibilities, and relationships:

- `src/main/tax-reporting/domain/services/monthly-tax-calculator.service.ts`
  Replays transactions in chronological order, maintains per-ticker running state, computes monthly outcomes, and emits
  audit payloads.
- `src/main/tax-reporting/domain/services/monthly-tax-asset-class-resolver.service.ts`
  Derives monthly tax classes from canonical asset data without expanding shared `AssetType`; it resolves `stock`,
  `unit`, `fii`, `etf`, or `unsupported`.
- `src/main/tax-reporting/domain/services/monthly-tax-irrf-allocator.service.ts`
  Reads daily broker tax rows and allocates stored daily IRRF across supported sale operations for monthly credit use.
- `src/main/tax-reporting/infra/repositories/monthly-tax-close.repository.ts`
  Persists summary columns plus a JSON detail payload in `monthly_tax_closes`.
- `src/main/tax-reporting/application/use-cases/list-monthly-tax-history.use-case.ts`
  Returns stored month summaries across the imported history range.
- `src/main/tax-reporting/application/use-cases/get-monthly-tax-detail.use-case.ts`
  Returns the full audit payload for one month.
- `src/main/tax-reporting/application/use-cases/recalculate-monthly-tax-history.use-case.ts`
  Rebuilds artifacts from the earliest affected year forward.
- `src/main/tax-reporting/infra/handlers/recalculate-monthly-tax-close.handler.ts`
  Subscribes to canonical fact-change events and keeps artifacts current automatically.
- `src/renderer/pages/MonthlyTaxPage.tsx` plus `src/renderer/pages/monthly-tax-page/*`
  Renders history, month detail, change summaries, and repair CTAs.
- `src/renderer/app-navigation/*`
  Adds a minimal tab-navigation seam so monthly repair CTAs can switch the user to existing pages.

Data flow between components:

- Canonical repositories (`transactions`, `assets`, `brokers`, `daily_broker_taxes`) feed the monthly calculator.
- The monthly calculator writes one artifact per month into `monthly_tax_closes`.
- History and month-detail use cases expose those artifacts through IPC.
- The renderer consumes ready-to-render summaries and detail payloads rather than composing tax logic locally.

External system interactions:

- SQLite via `knex` persists the derived monthly artifact table.
- No external service integration is required in V1.

## Implementation Design

### Core Interfaces

Key service interfaces with code examples:

```go
type MonthlyTaxCloseRepository interface {
    Save(close MonthlyTaxClose) error
    FindHistory() ([]MonthlyTaxCloseSummary, error)
    FindDetail(month string) (MonthlyTaxCloseDetail, error)
    DeleteFrom(year int) error
}
```

```ts
export interface RecalculateMonthlyTaxHistoryInput {
  startYear: number;
  reason: 'bootstrap' | 'transactions_changed' | 'fees_changed' | 'asset_type_changed' | 'manual';
}
```

```ts
export interface MonthlyTaxRepairTarget {
  tab: 'import' | 'assets' | 'brokers';
  hintCode: 'daily_broker_tax' | 'irrf' | 'asset_type' | 'broker_metadata';
}
```

Error handling conventions:

- Unsupported or missing facts do not throw when a month can still be represented; they become `blockedReasons` in the
  artifact payload.
- Repository failures and IPC payload validation failures still throw and are mapped by the existing IPC binding layer.

### Data Models

Core domain entities and their relationships:

- `monthly_tax_closes`
  One row per `YYYY-MM`, with `state`, `outcome`, `calculation_version`, `input_fingerprint`, `calculated_at`,
  `net_tax_due`, `carry_forward_out`, `change_summary`, and `detail_json`.
- `detail_json`
  Contains `summary`, `groups`, `blockedReasons`, `disclosures`, `carryForward`, and `saleLines`.
- `MonthlyWorkspaceState`
  `closed | blocked | obsolete | needs_review | below_threshold`.
  `obsolete` is a transient state used when upstream facts changed and a fresh artifact has not yet been committed.
- `MonthlyOutcome`
  `no_tax | exempt | tax_due | below_threshold | blocked`.
- `MonthlyTaxAssetClass`
  `stock | unit | fii | etf | unsupported`.
  `unit` is derived inside `tax-reporting` from stock-class tickers ending in `11`; shared `AssetType` remains
  unchanged.
- `RepairTarget`
  `{ tab: 'import' | 'assets' | 'brokers'; hintCode: 'daily_broker_tax' | 'irrf' | 'asset_type' | 'broker_metadata' }`.
- `AssetTaxClassificationChangedEvent`
  New shared event carrying `ticker` and `earliestYear` so monthly artifacts also refresh automatically after asset type
  repairs.

Database schemas or storage structures:

- No new canonical transaction table is introduced.
- Fees continue to come from `transaction_fees`.
- IRRF stays canonical in `daily_broker_taxes` and is allocated in memory during monthly calculation.

### API Endpoints

API surface organized by resource:

| Method | Path | Description |
| --- | --- | --- |
| `invoke` | `report:monthly-tax-history` | Returns persisted month summaries across the imported history range. Bootstraps a rebuild if artifacts do not exist yet. |
| `invoke` | `report:monthly-tax-detail` | Returns the full month audit payload for `{ month: 'YYYY-MM' }`. |
| `invoke` | `report:monthly-tax-recalculate` | Forces recomputation from `startYear` for manual retry or first-run recovery. |

Request format and required fields:

- History is summary-only and optimized for workspace rendering.
- Detail is month-scoped and includes group totals, carry-forward math, blocked reasons, disclosures, and sale lines.
- Recalculation accepts `startYear` and a machine-readable `reason`.

Response format and status codes:

- All three operations follow the existing Electron IPC contract pattern used by the repository.
- Read-only history and detail responses expose domain-ready data for the renderer.
- The recalculation command returns the rebuilt month range, changed month count, and recalculated timestamp.

## Integration Points

External services and system boundaries:

- `TransactionRepository`
  Primary tax source of truth. Monthly close replays transactions directly instead of reading persisted positions,
  because realized gains require sequential transaction state.
- `AssetRepository`
  Supplies canonical asset type and metadata; unresolved or ambiguous classifications can block a month.
- `BrokerRepository`
  Supplies broker labels for detail and repair hints.
- `DailyBrokerTaxRepository`
  Supplies daily fees and IRRF rows; it needs a period query for month-range loading.
- `SharedInfrastructure.queue`
  Reuses the existing in-process event mechanism so upstream IPC mutations and monthly recalculation complete in one
  flow.
- `tax_config`
  Remains the base source for tax rates and exemption defaults already present in SQLite; units are overlaid in
  `tax-reporting` as a feature-local rule, not a shared enum expansion.

## Impact Analysis

Table of components affected by this implementation:

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `src/main/tax-reporting/**` | modified | Becomes a stateful module with repositories, use cases, and startup handlers; medium risk | Add monthly domain, application, infra, and IPC wiring |
| `src/main/app/infra/database/migrations/**` | modified | Adds a derived-data table; medium risk | Add `016-create-monthly-tax-closes.ts` |
| `src/main/app/infra/container/types.ts` | modified | `tax-reporting` needs `shared` plus `ingestion` dependency access; low risk | Expand tax-reporting dependency types |
| `src/main/ingestion/application/repositories/daily-broker-tax.repository.ts` | modified | Monthly close needs period reads; low risk | Add `findByPeriod(...)` |
| `src/main/portfolio/application/use-cases/repair-asset-type.use-case.ts` and shared events | modified | Monthly close needs an asset-type change event; medium risk | Inject `Queue` and publish a new event |
| `src/ipc/contracts/tax-reporting/**` and renderer IPC registry | modified | Adds new coarse contracts; low risk | Register history, detail, and recalculation contracts |
| `src/renderer/App.tsx` and new monthly page files | modified/new | Adds a top-level tab and navigation seam; medium risk | Add `monthly-tax` tab and page-local hooks and components |

## Testing Approach

### Unit Tests

- `monthly-tax-calculator.service.spec.ts`
  Covers month grouping, carry-forward propagation, below-threshold roll-forward, blocked months, and change-summary
  generation.
- `monthly-tax-asset-class-resolver.service.spec.ts`
  Covers stock versus unit derivation, unsupported assets, and unresolved catalog cases.
- `monthly-tax-irrf-allocator.service.spec.ts`
  Covers daily IRRF allocation across supported sale operations and missing-tax blocking behavior.
- `monthly-history-state-resolver.service.spec.ts`
  Covers `closed`, `blocked`, `obsolete`, `needs_review`, and `below_threshold` derivation.

### Integration Tests

- `monthly-tax-close.repository.spec.ts`
  Verifies SQLite persistence of summary columns and JSON detail payloads.
- History, detail, and recalculation use-case specs
  Verify bootstrap rebuild, forward recomputation, and change propagation.
- `tax-reporting` container spec
  Verifies contract registration, dependency wiring, and queue subscription startup.
- Queue-driven recalculation integration
  Verifies transaction import, fee reallocation, and asset-type repair all refresh monthly artifacts.

### End-to-End UI

- Open `MonthlyTaxPage`, load history, inspect month detail, and view the fixed tax groups.
- Follow a blocked-month repair CTA to an existing tab, fix the upstream fact, return to monthly history, and verify
  the changed result appears.
- Verify background refresh behavior after transaction import or daily broker tax edits in the same app session.

## Development Sequencing

### Build Order

1. Add `monthly_tax_closes` migration and repository contracts. No dependencies.
2. Implement monthly domain services for asset-class resolution, IRRF allocation, day-trade blocking, and month
   calculation. Depends on step 1 for artifact targets.
3. Implement history, detail, and recalculation use cases plus the queue-driven handler. Depends on steps 1 and 2.
4. Extend app container types, `tax-reporting` module composition, shared events, and IPC contracts. Depends on step 3.
5. Build `MonthlyTaxPage`, tab-navigation support, and read-only repair CTAs. Depends on step 4.
6. Add backend integration tests, renderer tests, and the end-to-end monthly workflow test. Depends on steps 1 through
   5.

### Technical Dependencies

- `DailyBrokerTaxRepository` needs a period read method.
- `repair-asset-type.use-case.ts` needs queue access to publish the new classification-change event.
- The renderer needs a minimal shared navigation mechanism because the app currently uses tab state, not routes.
- No external service availability is required for MVP.

## Monitoring and Observability

Operational visibility for the implementation:

- Structured main-process log events:
  `monthly_tax_recalc_started`, `monthly_tax_recalc_completed`, `monthly_tax_recalc_failed`, `monthly_tax_month_blocked`.
- Required log fields:
  `startYear`, `endMonth`, `month`, `reason`, `calculationVersion`, `state`, `changedMonthCount`, `durationMs`.
- Renderer visibility:
  history items surface `changeSummary` and `calculatedAt`; detail shows calculation version and blocking reasons.
- Remote alerting is not applicable in the current desktop architecture. Local diagnostic logs are the MVP
  observability boundary.

## Technical Considerations

### Key Decisions

- ADR-004 persists one current artifact per month and updates it automatically when canonical facts change.
- ADR-005 keeps monthly close inside `tax-reporting` and exposes a coarse IPC surface.
- ADR-006 keeps repairs read-only inside monthly close and routes users to existing tabs.
- MVP does not add a separate persisted `mark reviewed` mutation. `needs_review` is derived when a final artifact
  carries a change summary or policy/manual-input disclosure; `closed` means the final artifact has no such flags.
- Day trade remains out of scope. Because the canonical transaction model does not carry an explicit day-trade flag,
  same-day opposing trades for the same ticker block the month instead of being silently blended into common-operation
  output.

### Known Risks

- Tax-rule correctness risk
  Mitigation: keep rule logic isolated in `tax-reporting` services and pin regression fixtures to the official
  references already used in the PRD:
  [Demonstrativo de Apuração de Ganhos](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/demonstrativo-de-apuracao-de-ganhos),
  [Isenções](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/isencoes),
  [Retenções](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/retencoes),
  [Fundos de Investimento no Brasil](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/fundos-de-investimento-no-brasil),
  and [Preciso pagar imposto menor que 10 reais?](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/imposto-de-renda/dirpf/pagamento/preciso-pagar-imposto-menor-que).
- IRRF granularity risk
  Mitigation: allocate daily IRRF in a single dedicated service, keep the raw daily value canonical, and block months
  when required daily rows are missing.
- Navigation complexity risk
  Mitigation: keep repair targets tab-based and avoid router-level abstractions in MVP.
- Recalculation fan-out risk
  Mitigation: recompute from the earliest affected year forward and keep history reads artifact-based.

## Architecture Decision Records

- [ADR-001: Define V1 Scope for Monthly Tax Calculation](adrs/adr-001.md) — Sets the supported monthly tax scope,
  trust boundary, and conservative unit policy for V1.
- [ADR-002: Choose an Audit-First History Workspace for Monthly Tax Close](adrs/adr-002.md) — Makes full-history
  review and month-level auditability the primary product flow.
- [ADR-003: Use Fixed Monthly Tax Groups and Preserve Below-Minimum Roll-Forward](adrs/adr-003.md) — Fixes the
  user-facing grouping model and the explicit below-threshold state.
- [ADR-004: Persist Monthly Close Artifacts and Recalculate Forward Automatically](adrs/adr-004.md) — Persists one
  current artifact per month and refreshes it automatically after upstream changes.
- [ADR-005: Keep Monthly Close in Tax Reporting with Coarse-Grained IPC](adrs/adr-005.md) — Keeps monthly close inside
  `tax-reporting` and serves the renderer with a small IPC surface.
- [ADR-006: Keep Monthly Repair Read-Only and Route Users to Existing Flows](adrs/adr-006.md) — Preserves
  bounded-context ownership by routing blocked-month fixes to existing pages.
