# TechSpec: B3 Capital Gains Assessment

## Executive Summary

Implement the B3 capital gains assessment as an additive workflow inside
`src/main/tax-reporting`. The backend will read existing portfolio, fee, asset, and daily
broker tax facts through a dedicated tax-reporting query port, calculate monthly Renda
Variavel rows for a selected tax year, and expose render-ready annual totals, month
statuses, blockers, and sale-level traces through typed IPC.

The primary trade-off is adding a report-specific read model instead of reusing only
aggregate repositories. This keeps portfolio persistence clean and makes the tax
assessment testable, but adds a Knex query adapter that must stay aligned with
transaction, fee, asset, and daily broker tax schemas.

## System Architecture

### Component Overview

- `GenerateCapitalGainsAssessmentUseCase`: orchestrates the selected-year assessment and
  returns the IPC output DTO.
- `CapitalGainsAssessmentQuery`: application-layer read port for assessment source facts.
- `KnexCapitalGainsAssessmentQuery`: joins transactions, allocated fees, asset
  classifications, and daily broker taxes for the selected year.
- `CapitalGainsAssessmentService`: calculates average cost, realized sale results,
  monthly category totals, exemption classification, blockers, and traces.
- `CapitalGainsLossCompensationService`: applies same-category current-year loss
  compensation for stock, FII, and ETF categories.
- `capital-gains-assessment.contract.ts`: Zod-validated IPC contract exposed to the
  renderer.
- `CapitalGainsPage` and `useCapitalGainsAssessment`: dedicated renderer surface for
  tax-year selection, monthly table, annual totals, and expandable traces.

Data flow:

1. Renderer calls `window.electronApi.generateCapitalGainsAssessment({ baseYear })`.
2. IPC validates payload and invokes the tax-reporting handler.
3. Use case loads assessment facts through `CapitalGainsAssessmentQuery`.
4. Domain services compute monthly rows and annual totals.
5. Renderer displays returned DTOs without recalculating tax rules.

## Implementation Design

### Core Interfaces

Project implementation will use TypeScript. The canonical workflow requires one Go-shaped
core type example; this struct represents the stable output contract shape that TypeScript
DTOs will implement.

```go
type CapitalGainsMonth struct {
  Month string
  Status string
  Categories []CapitalGainsCategory
  Blockers []AssessmentBlocker
  Traces []SaleTrace
}
```

TypeScript application port:

```typescript
export interface CapitalGainsAssessmentQuery {
  findSourceFacts(input: {
    baseYear: number;
  }): Promise<CapitalGainsAssessmentFacts>;
}
```

Use case contract:

```typescript
export class GenerateCapitalGainsAssessmentUseCase {
  constructor(
    private readonly query: CapitalGainsAssessmentQuery,
    private readonly assessmentService: CapitalGainsAssessmentService,
  ) {}

  async execute(input: GenerateCapitalGainsAssessmentInput): Promise<GenerateCapitalGainsAssessmentOutput>;
}
```

### Data Models

`GenerateCapitalGainsAssessmentInput`:

- `baseYear: number`

`GenerateCapitalGainsAssessmentOutput`:

- `baseYear: number`
- `generatedAt: string`
- `annualTotals: CapitalGainsAnnualTotals`
- `months: CapitalGainsMonth[]`
- `summaryBlockers: AssessmentBlocker[]`

Supported categories:

- `stock`
- `fii`
- `etf`

Month statuses:

- `ready`
- `pending`
- `unsupported`
- `mixed`

Trace fields:

- source transaction id and date
- ticker and asset category
- sale quantity and proceeds
- acquisition cost basis
- fees considered
- average cost before and after sale
- gross result
- exempt amount
- taxable amount
- loss generated
- compensated loss amount
- remaining category loss balance
- applied classification

No new persistent tables are required for V1. Prior-year loss balances are not read from
`accumulated_losses`; selected-year balances start at zero.

### API Endpoints

Electron IPC contract:

- Channel: `tax-reporting:capital-gains-assessment`
- Renderer API: `generateCapitalGainsAssessment(input)`
- Input: `{ baseYear: number }`
- Output: `GenerateCapitalGainsAssessmentOutput`
- Error mode: `throw`
- Payload validation: Zod integer year schema with a tax-reporting-specific error message.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `src/main/tax-reporting/application/use-cases` | new | Adds assessment orchestration. Medium correctness risk. | Add use case, DTOs, and focused specs. |
| `src/main/tax-reporting/application/queries` | new | Adds report read model boundary. Low architecture risk. | Define query port DTOs. |
| `src/main/tax-reporting/infra/queries` | new | Joins source tables through Knex. Medium schema drift risk. | Add adapter and integration-style tests. |
| `src/main/tax-reporting/domain` | modified | Adds capital gains calculation services. High rule correctness risk. | Add fixture-heavy unit tests. |
| `src/preload/contracts/tax-reporting` | modified | Adds renderer-exposed IPC contract. Medium boundary risk. | Add contract registry/API typing tests. |
| `src/main/app/infra/container/index.ts` | modified | Wires query, use case, and registrar dependencies. Low wiring risk. | Update container tests. |
| `src/main/tax-reporting/transport` | modified | Binds new handler to IPC. Low runtime risk. | Add handler/registrar tests. |
| `src/renderer/pages` | modified | Adds dedicated Renda Variavel page/tab. Medium UX risk. | Add page/hook tests. |
| Existing import, positions, assets, Bens e Direitos | unchanged | Must not regress. Medium regression risk. | Run existing focused suites and full Jest gate. |

## Testing Approach

### Unit Tests

- Average cost calculation across buys, sells, initial balances, bonus events, splits,
  reverse splits, transfers, and fraction auctions.
- Stock sale threshold below, equal to, and above R$ 20,000.
- FII and ETF gains never receive stock exemption.
- Same-category loss compensation inside the selected year.
- Day trade detection and unsupported blockers.
- Pending blockers for missing asset type or ambiguous cost-basis data.
- Mixed month behavior when supported results and blockers coexist.
- Annual totals derived only from monthly rows.

### Integration Tests

- Knex query adapter returns transactions with allocated fees and asset classifications for
  a selected year.
- IPC contract validates payload and returns typed output through `ReportIpcRegistrar`.
- Container resolves the new query, use case, handlers, and registrar.
- Renderer page calls `generateCapitalGainsAssessment` and renders ready, pending,
  unsupported, and mixed rows.

## Development Sequencing

### Build Order

1. Add shared/domain enums and DTOs for capital gains assessment statuses, categories,
   blockers, traces, and totals - no dependencies.
2. Add `CapitalGainsAssessmentQuery` port and Knex adapter - depends on step 1.
3. Add average-cost and corporate-action calculation services - depends on step 1.
4. Add monthly classification and same-category loss compensation services - depends on
   step 3.
5. Add `GenerateCapitalGainsAssessmentUseCase` - depends on steps 2, 3, and 4.
6. Add IPC contract, handler, registrar binding, renderer API typing, and container wiring
   - depends on step 5.
7. Add `CapitalGainsPage` and `useCapitalGainsAssessment` dedicated renderer flow -
   depends on step 6.
8. Add regression and fixture coverage for PRD success metrics - depends on steps 3
   through 7.

### Technical Dependencies

- Existing imported transaction and allocated fee data must be available.
- Existing asset catalog classification must distinguish stock, FII, ETF, BDR, and missing
  types.
- Current V1 does not depend on prior-year loss persistence, DARF memory, or new database
  tables.

## Monitoring and Observability

This is a local Electron workflow, so no remote monitoring is required for V1. The use
case should surface structured blockers in output rather than relying on logs. Unexpected
backend errors should follow existing IPC error mapping.

Useful internal fields:

- `baseYear`
- month key
- ticker
- asset category
- blocker code
- source transaction id
- unsupported reason

## Technical Considerations

### Key Decisions

- Decision: Place the workflow in `tax-reporting`.
  Rationale: It is assessment/reporting output that consumes portfolio facts.
  Trade-off: Future DARF workflows may justify a separate context later.
- Decision: Use a dedicated read/query port.
  Rationale: The assessment needs report-shaped joined facts, not aggregate persistence.
  Trade-off: Adds a Knex adapter that must track schema changes.
- Decision: Backend returns render-ready rows and traces.
  Rationale: Tax rules stay testable in backend code.
  Trade-off: IPC payloads are richer.
- Decision: Current-year-only loss compensation.
  Rationale: Avoid treating unused `accumulated_losses` data as reliable tax memory.
  Trade-off: Users with prior losses need Phase 2 support.
- Decision: Support existing corporate-action transaction types in V1.
  Rationale: Ignoring them can corrupt cost basis.
  Trade-off: Larger calculation and fixture test matrix.
- Decision: Use a dedicated renderer page/tab.
  Rationale: Renda Variavel assessment is separate from Bens e Direitos.
  Trade-off: Adds navigation and page-level tests.

### Known Risks

- Corporate-action logic may be wrong for edge cases.
  Mitigation: isolate services and cover each supported transaction type with fixtures.
- Users may rely on current-year compensation despite prior losses.
  Mitigation: show that V1 starts loss balances at zero for the selected year.
- Day trade may leak into ordinary operation results.
  Mitigation: detect same-day buy/sell patterns per ticker and mark affected month as
  mixed or unsupported.
- Receita rules can change.
  Mitigation: centralize constants such as the R$ 20,000 stock-sale threshold and
  supported category rules.
- Output may become dense.
  Mitigation: monthly table shows status and totals first; traces remain expandable.

## Architecture Decision Records

- [ADR-001: Additive Monthly Assessment Before DARF Engine](adrs/adr-001.md) — V1 adds a
  separate monthly assessment workflow and defers DARF generation.
- [ADR-002: Annual Month-by-Month Assessment as V1 Product Approach](adrs/adr-002.md) —
  V1 prioritizes annual IRPF copy support through monthly assessed rows.
- [ADR-003: Tax Reporting Read Model for Capital Gains Assessment](adrs/adr-003.md) —
  Technical implementation lives in tax-reporting with a dedicated read model and
  render-ready IPC output.
- [ADR-004: Current-Year Assessment With Corporate Action Support](adrs/adr-004.md) — V1
  compensates losses within the selected year and supports corporate-action cost-basis
  effects.
