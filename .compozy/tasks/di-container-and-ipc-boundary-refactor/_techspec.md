# DI Container and IPC Boundary Refactor TechSpec

## Executive Summary

This TechSpec is driven by codebase analysis and clarification decisions from May 5, 2026. No
`_prd.md` exists for this task, so the design is based on the current repository structure, the
refactoring report, and the approved architecture direction.

The implementation keeps Awilix but replaces the global main-process composition root with
context-level registration modules. In parallel, it defines IPC as a dedicated public API module,
separate from `src/shared`, with `src/preload` reduced to Electron bridge runtime only. The
primary trade-off is a wider one-step migration: there is no compatibility layer or phased alias
period, but the resulting ownership model is materially clearer and avoids carrying two public
boundaries at once.

## System Architecture

### Component Overview

- `src/main/app/infra/container`: becomes the root bootstrap only. It creates the container
  instance, registers shared infrastructure, invokes context registrars, and returns the assembled
  bootstrap outputs required by `main.ts`.
- `src/main/<context>/infra/container`: each bounded context owns its own registrations for
  repositories, services, use cases, and IPC registrars.
- `src/ipc`: new dedicated IPC module.
  - `src/ipc/contracts/**`: public request/response DTOs, channel constants, and schemas.
  - `src/ipc/main/**`: main-side binding and registry infrastructure.
  - `src/ipc/renderer/**`: renderer API builders and typing helpers.
  - `src/ipc/public/index.ts`: the only renderer-facing import entrypoint.
- `src/preload/preload.ts`: only bridges Electron primitives to the public IPC module.
- `src/main/**/transport/**`: maps public IPC DTOs to application inputs/outputs.
- `src/main/**/application/**`: owns use-case `Input`/`Output` models and no longer imports IPC
  contracts.
- `src/shared`: remains for process-agnostic utilities only, such as year helpers. It is no
  longer a home for renderer-consumed domain/API types.

Data flow:
1. Renderer imports only from `src/ipc/public`.
2. Renderer calls `window.electronApi`.
3. `src/preload/preload.ts` exposes the API via `contextBridge`.
4. Main transport registrars bind unchanged channels to handlers.
5. Handlers map IPC DTOs into application DTOs.
6. Use-cases execute without transport coupling.

## Implementation Design

### Core Interfaces

```go
type MainBootstrap struct {
    IpcRegistry IpcRegistry
}
```

```ts
export interface MainBootstrap {
  ipcRegistry: IpcRegistry;
}

export interface ModuleRegistrar {
  register(container: AwilixContainer): void;
}

export function createMainBootstrap(db: Knex): MainBootstrap;
```

```ts
export interface SaveInitialBalanceDocumentInput {
  ticker: string;
  year: number;
  assetType: AssetType;
  averagePrice: string;
  allocations: SaveInitialBalanceAllocationInput[];
}

export interface SaveInitialBalanceDocumentOutput {
  ticker: string;
  year: number;
  assetType: AssetType;
  totalQuantity: string;
}
```

Error handling conventions:
- IPC channels keep their current names and semantics.
- Public IPC contracts continue using the current result/throw behavior already defined per
  contract.
- Handlers own mapping between public DTO validation/parsing and application execution.
- Application layers throw or return application-owned results without importing IPC contract
  types.

### Data Models

Internal models:
- Move backend-only enums and shared internal concepts out of `src/shared/types/domain.ts`.
- Place cross-context internal types under `src/main/shared/**` when they are truly
  backend-shared.
- Keep context-specific concepts inside their bounded context when possible.

Public IPC models:
- Define public DTOs in `src/ipc/contracts/**`.
- Use schema-owned string unions or DTO enums in the IPC module, even when values mirror backend
  enums.
- Do not import backend/domain enums into renderer-facing contracts.

Example ownership split:
- Internal: `TransactionType`, `SourceType`, import-review state, application inputs/outputs.
- Public IPC: `AssetTypeDto`, `ReportItemStatusDto`, `ListPositionsResponse`,
  `PreviewImportTransactionsResponse`.

### API Endpoints

These are Electron IPC contracts, not HTTP endpoints. Channel names are preserved.

Resources:
- `app`: health/runtime metadata.
- `portfolio/assets`: list/update/repair asset catalog.
- `portfolio/brokers`: list/create/update/toggle active broker.
- `portfolio/portfolio`: list positions, recalculate, migrate year, initial balance flows,
  consolidated position import, delete position.
- `ingestion/import`: file selection, import preview, import confirmation, daily broker taxes.
- `tax-reporting/report`: annual assets report.

Boundary rules:
- Renderer imports only from `src/ipc/public`.
- Main transport imports from `src/ipc/contracts/**` and `src/ipc/main/**`.
- Application and domain code do not import from `src/ipc/**`.

## Integration Points

No external services are added. The refactor stays inside Electron, IPC transport, Awilix
composition, and existing React/main-process workflows.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `src/main/app/infra/container` | modified | Root bootstrap shrinks and loses global singleton behavior | Replace exported global container with bootstrap factory |
| `src/main/<context>/infra/container` | new | Context-owned registration modules become the unit of composition | Add module registrars for `app`, `portfolio`, `ingestion`, `tax-reporting` |
| `src/ipc/**` | new | Dedicated public IPC package becomes the process boundary | Move contracts, binding helpers, renderer API builders, and public exports |
| `src/preload/preload.ts` | modified | Preload keeps only Electron bridge runtime responsibility | Import from the new IPC public module |
| `src/main/**/transport/**` | modified | Handlers/registrars become DTO mapping boundary | Add transport-to-application mapping functions |
| `src/main/**/application/**` | modified | Use-cases own `Input`/`Output` types | Remove imports from IPC contract files |
| `src/renderer/**` | modified | Renderer stops importing deep contract files and shared domain types | Redirect all imports to `src/ipc/public` |
| `src/shared/types/domain.ts` | deprecated | Mixed ownership file is dismantled | Delete or reduce to zero renderer-facing API types |
| ESLint config | modified | Import boundaries need enforcement | Add `no-restricted-imports` rules for renderer and application layers |

## Testing Approach

### Unit Tests

- Context registration modules resolve only their owned dependencies.
- Root bootstrap assembles `ipcRegistry` correctly from module registrars.
- Public IPC entrypoint exports the expected renderer API types/contracts.
- Transport handlers correctly map public DTOs to application DTOs.
- Application use-cases compile and run without importing IPC contracts.
- Lint rules fail when renderer imports from `src/shared/types/**` or deep `src/ipc/contracts/**`.

### Integration Tests

- Existing IPC channels remain registered with the same names.
- Renderer workflows still compile and run using only `src/ipc/public`.
- Main-process contract registry still exposes the same public methods to preload.
- Portfolio, ingestion, and reporting integration tests continue passing after DTO ownership
  moves.

## Development Sequencing

### Build Order

1. Create `src/ipc/**` and define the new public entrypoint - no dependencies.
2. Move main-side IPC binding/registry helpers into `src/ipc/main/**` - depends on step 1.
3. Move renderer API builders/types into `src/ipc/renderer/**` and update
   `src/preload/preload.ts` - depends on steps 1 and 2.
4. Rewrite renderer imports to `src/ipc/public` and remove renderer imports from
   `src/shared/types/domain.ts` - depends on step 3.
5. Introduce application-owned `Input`/`Output` types in affected use-cases and map in transport
   handlers - depends on steps 1 and 2.
6. Split the main composition root into context-level registrars while keeping Awilix - depends
   on step 5 because the new transport/application seams must be stable first.
7. Remove the global container export and `container.resolve(...)` service-locator pattern -
   depends on step 6.
8. Delete or empty the obsolete mixed-type exports in `src/shared/types/domain.ts` and remove
   legacy import paths - depends on steps 4 through 7.
9. Add boundary lint rules and run the full test/lint suite - depends on steps 4 through 8.

### Technical Dependencies

- Existing Awilix usage remains the DI framework baseline.
- Existing IPC channels must remain unchanged.
- Existing renderer API method names must remain unchanged.
- Existing integration tests should be reused as regression safety nets.

## Monitoring and Observability

This is a local Electron application. Operational monitoring is not required. The relevant
observability for this refactor is structural:
- bootstrap tests proving module wiring;
- contract exposure tests proving unchanged channels/method names;
- lint enforcement proving the renderer cannot import shared domain/API internals.

## Technical Considerations

### Key Decisions

- Decision: Keep Awilix and modularize composition by context.
  Rationale: fixes ownership and service-locator sprawl without paying for a DI framework rewrite.
  Trade-off: Awilix remains part of the architecture.
  Alternatives rejected: full manual DI, keeping the global container.

- Decision: Treat IPC as a dedicated public API module.
  Rationale: renderer/main is a process boundary analogous to a controller/API boundary.
  Trade-off: requires a broad direct-cut import migration.
  Alternatives rejected: keep public contracts in `src/preload`, move them into `src/shared`.

- Decision: Renderer imports only from one public IPC entrypoint.
  Rationale: prevents deep-path and shared-domain coupling from reappearing.
  Trade-off: one public facade must stay curated.
  Alternatives rejected: direct renderer imports from individual contract files.

- Decision: Application use-cases own their own DTOs.
  Rationale: transport contracts should not define application boundaries.
  Trade-off: some structurally similar types will exist in both layers.
  Alternatives rejected: reuse IPC DTOs directly inside use-cases.

- Decision: Preserve current IPC channel names.
  Rationale: this refactor targets ownership and boundaries, not public behavior churn.
  Trade-off: some legacy naming survives the first cut.
  Alternatives rejected: channel renaming as part of the same refactor.

### Known Risks

- Direct-cut migration increases short-term blast radius.
  Mitigation: preserve channels/method names and run full lint/test regression before merge.

- Public DTO values can drift from internal backend enums.
  Mitigation: define explicit mapping functions and schema tests around the transport boundary.

- Composition root split can accidentally duplicate shared registrations.
  Mitigation: keep shared infrastructure registration in one root-level helper and context
  ownership in dedicated module registrars.

- Renderer could regress into importing internal modules again later.
  Mitigation: enforce `no-restricted-imports` rules for renderer and application layers.

## Architecture Decision Records

- [ADR-001: Keep Awilix and Split the Main Composition Root by Context](adrs/adr-001.md) — The DI
  framework stays, but composition ownership moves to bounded-context registrars and the global
  container is removed.
- [ADR-002: Define a Dedicated IPC Public API Module and Remove Renderer Access to Shared Domain Types](adrs/adr-002.md) — IPC becomes a dedicated public boundary, separate from
  `src/shared`, with one renderer-facing entrypoint.
- [ADR-003: Keep Application Use-Case Inputs and Outputs Inside `src/main`](adrs/adr-003.md) —
  Use-cases own application DTOs and transport mapping stays in handlers.
