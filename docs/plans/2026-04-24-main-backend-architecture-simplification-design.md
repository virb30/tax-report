# Backend Architecture Simplification Design

> Date: 2026-04-24
> Scope: `src/main`
> Status: Approved direction from brainstorming

## Goal

Simplify the Electron main-process backend so feature work is more direct, while preserving
the useful parts of DDD, Clean Architecture, and Hexagonal Architecture: business rules must
not depend on Electron, IPC, SQLite, Knex, SheetJS, or other implementation details.

The current architecture separates contexts by global layers (`domain`, `application`,
`infrastructure`, `ipc`). That is technically valid, but it makes product capabilities hard
to see because each feature is spread across many folders. The target architecture should
instead group code by business proximity and dependency.

## Guiding Decisions

1. Use a Go-inspired package style adapted to TypeScript.
2. Prefer a small number of vertical business modules over global architecture layers.
3. Keep context as the first navigation axis, then split each context into physical layers.
4. Keep domain and use-case code independent from technical adapters.
5. Avoid one-file-per-input/output/use-case ceremony for small operations.
6. Use explicit module composition instead of a broad dependency injection container if feasible.
7. Standardize IPC error responses as `Result`, not mixed throw/result behavior.

## Target Top-Level Structure

```text
src/main/
  portfolio/
    domain/
      broker.ts
      position.ts
      portfolio-entry.ts
      project-positions.ts
      average-price.ts
      errors.ts
    application/
      use-cases.ts
      repository.ts
      dto.ts
    infrastructure/
      sqlite-repository.ts
      ipc.ts

  imports/
    domain/
      b3-movement-mapper.ts
      parsed-import.ts
      errors.ts
    application/
      use-cases.ts
      portfolio-gateway.ts
      dto.ts
    infrastructure/
      spreadsheet-parser.ts
      consolidated-position-parser.ts
      sheetjs-reader.ts
      ipc.ts

  tax/
    domain/
      declaration-report.ts
      monthly-assessment.ts
      tax-config.ts
      errors.ts
    application/
      use-cases.ts
      repository.ts
      dto.ts
    infrastructure/
      sqlite-repository.ts
      ipc.ts

  shared/
    database/
    electron/
    errors.ts
    result.ts
    ipc/
```

This structure intentionally removes global `domain/`, `application/`, `infrastructure/`,
and `ipc/` folders. Those layers still exist, but they live inside each business module.
That keeps the feature easy to find while preserving physical separation between business
rules, orchestration, and adapters.

The navigation rule is:

```text
module first, layer second
```

For example, broker behavior is under `portfolio/`, not split globally across
`domain/portfolio`, `application/use-cases/brokers`, `infrastructure/repositories`, and
`ipc/controllers`.

## Module Responsibilities

### Portfolio

`portfolio` is the core module. It owns the user's investment state and the rules for
turning portfolio entries into positions.

It should include:

- brokers and custody metadata;
- market transactions;
- initial balances;
- manual position adjustments;
- yearly positions;
- average-price calculations;
- position projection and recalculation;
- portfolio-facing use cases such as list positions, set initial balance, migrate year,
  recalculate position, and broker management.

`Broker` should not be a top-level context. In the current product, it is supporting data
for custody, import resolution, position allocation, and reports. It fits under portfolio.

### Imports

`imports` is an acquisition/adaptation module. It translates external formats into portfolio
commands or portfolio entries.

It should include:

- B3 spreadsheet movement mapping;
- CSV/XLSX parsing;
- consolidated-position parsing;
- import preview flows;
- import confirmation flows.

It should not own portfolio calculation rules. Once data is normalized, it delegates to
portfolio use cases.

### Tax

`tax` consumes portfolio state to produce tax outputs.

It should include:

- annual declaration report generation;
- asset metadata needed for declaration, such as issuer CNPJ;
- future monthly tax assessment and DARF rules;
- tax configuration and accumulated-loss behavior.

Annual declaration and monthly assessment may remain in one flat `tax` module initially.
If the module grows, split internally into `declaration/` and `assessment/`.

### Shared

`shared` contains application-level technical infrastructure and cross-module primitives.

It should include:

- database connection and migrations;
- Electron lifecycle and window setup;
- generic IPC binding helpers;
- `AppError`;
- `Result`;
- shared date/year helpers and other truly cross-cutting primitives.

`shared` should not become a dumping ground for business concepts. If a concept belongs to
portfolio, imports, or tax, keep it in that module.

## Portfolio Source Of Truth

Positions should be treated as a persisted projection/cache, not as the only source of truth.
However, the source of truth is not only market transactions. The better model is a broader
portfolio ledger:

```ts
type PortfolioEntry =
  | TradeTransaction
  | CorporateActionTransaction
  | TransferTransaction
  | InitialBalanceEntry
  | ManualPositionAdjustment;
```

`Transaction` remains useful, but it should represent market-like events. A manual correction
such as "set PETR4 average price from 20.00 to 17.50" is not naturally a transaction because
the user should not need to calculate synthetic quantity or unit-price values. It is better
modeled as `ManualPositionAdjustment`.

The canonical flow becomes:

```text
external/manual input
  -> normalize and validate
  -> persist portfolio entries
  -> project affected positions
  -> persist positions cache
  -> query reports/screens from cache where useful
```

Recalculation should be deterministic: given the same portfolio entries, the projector should
produce the same positions. Manual adjustments participate in that projection explicitly.

## Position Adjustments

Manual edits to position quantity or average price should be explicit portfolio entries.

Example shape:

```ts
type ManualPositionAdjustment = {
  id: string;
  ticker: string;
  year: number;
  brokerId: string;
  targetQuantity: number;
  targetAveragePrice: number;
  date: string;
  reason?: string;
  createdAt: string;
};
```

The user experience remains direct: the user enters the desired final quantity and average
price. The system stores that intent and applies it in projection. This avoids a second
silent source of truth while preserving auditability.

An important product rule must be decided during implementation: whether an adjustment applies
from its `date` forward, or as a year-end/final override for the selected year. The architecture
supports either, but the projector must make the rule explicit and tested.

## Dependency Rules

Inside a module, dependencies should point inward:

```text
domain
  <- application
  <- infrastructure
```

Concrete rules:

1. `domain/` must not import Electron, Knex, SQLite, SheetJS, Zod, or IPC helpers.
2. `application/` may depend on `domain/` and repository/gateway interfaces.
3. `application/` must not depend on concrete SQLite, Electron, SheetJS, or IPC adapters.
4. `infrastructure/` may depend on `application/` and `domain/` to implement ports and handlers.
5. IPC files own Zod payload validation and transport conversion.
6. SQLite files own persistence mapping.
7. Repository interfaces live in the owning module's `application/` layer, not in a global
   `application/repositories` folder.
8. Shared infrastructure lives in `shared/` only when it is truly cross-module.

Module dependency rules:

1. `imports` may depend on portfolio application ports or use cases, but `portfolio` must not
   depend on `imports`.
2. `tax` may depend on portfolio query/use-case outputs, but `portfolio` must not depend on `tax`.
3. Cross-module dependencies should target the other module's `application/` API or DTOs, not its
   infrastructure files.

## IPC Error Strategy

Use cases and domain code should throw application errors. IPC should convert errors into a
single renderer-facing result format.

```ts
type AppErrorKind = 'validation' | 'not_found' | 'conflict' | 'business' | 'unexpected';

class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly kind: AppErrorKind,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type IpcResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        kind: AppErrorKind;
        details?: unknown;
      };
    };
```

Recommended rule:

- Domain and use cases throw `AppError` or plain `Error`.
- IPC binder catches all errors.
- Zod errors become `kind: 'validation'` and `code: 'INVALID_PAYLOAD'`.
- Known `AppError`s preserve their code, message, kind, and details.
- Unknown errors become `kind: 'unexpected'` with a generic user-facing message.
- Renderer-facing APIs return `IpcResult<T>` for all user-facing operations.

This removes the current ambiguity where some IPC operations throw and others return
`{ success, error }`.

Use stable error codes by module, for example:

```text
PORTFOLIO_INVALID_YEAR
PORTFOLIO_POSITION_NOT_FOUND
PORTFOLIO_NEGATIVE_QUANTITY
BROKER_CODE_ALREADY_EXISTS
IMPORT_FILE_INVALID
IMPORT_BROKER_NOT_FOUND
TAX_UNSUPPORTED_ASSET_TYPE
INVALID_PAYLOAD
UNEXPECTED_ERROR
```

## Use Case Shape

Prefer fewer use-case files with cohesive exported functions or classes per module.

Instead of:

```text
application/use-cases/create-broker/
  create-broker.input.ts
  create-broker.output.ts
  create-broker.use-case.ts
```

Prefer:

```text
portfolio/application/use-cases.ts
```

with nearby command/result types:

```ts
export type CreateBrokerCommand = {
  name: string;
  cnpj: string;
  code: string;
};

export async function createBroker(
  command: CreateBrokerCommand,
  deps: PortfolioDeps,
): Promise<BrokerDto> {
  // ...
}
```

Classes remain acceptable when they clarify stateful dependencies, but the default should be
plain functions and explicit dependency objects for simpler operations.

If a module's `use-cases.ts` grows too large, split by workflow rather than by single action:

```text
portfolio/application/
  broker-use-cases.ts
  position-use-cases.ts
  repository.ts
  dto.ts
```

Avoid returning to one directory per small command unless the command has substantial private
types, collaborators, and tests.

## Composition

The current broad DI container adds indirection for a small application. The target should
prefer explicit composition:

```ts
export function createMainServices(db: Knex) {
  const portfolioRepository = new SqlitePortfolioRepository(db);
  const portfolio = createPortfolioUseCases({ portfolioRepository });
  const imports = createImportUseCases({ portfolio, spreadsheetReader });
  const tax = createTaxUseCases({ portfolio, taxRepository });

  return { portfolio, imports, tax };
}
```

This keeps construction visible and makes feature wiring easier to follow. If a container
remains, it should be hidden behind explicit module factories rather than used as the main
architectural surface.

## Testing Strategy

The target test layout should follow module ownership:

- `portfolio/domain/project-positions.test.ts` for deterministic projection rules;
- `portfolio/application/use-cases.test.ts` for portfolio command behavior;
- `portfolio/infrastructure/sqlite-repository.test.ts` for persistence mapping;
- `imports/domain/*.test.ts` for import mapping rules;
- `imports/infrastructure/*.test.ts` for parser/reader behavior;
- `tax/domain/declaration-report.test.ts` for annual report formatting;
- `shared/ipc/*.test.ts` for `IpcResult` mapping and validation.

Manual position adjustments need focused projector tests, especially around ordering with
transactions before and after the adjustment date.

## Migration Notes

This design is intentionally big-bang oriented. If implemented, the migration should still be
done with strong verification checkpoints:

1. Introduce shared `AppError`, `Result`, and IPC binder behavior.
2. Move portfolio model and projection logic into the new `portfolio/` module.
3. Represent manual corrections as `ManualPositionAdjustment` entries.
4. Move import parsing into `imports/` and delegate to portfolio.
5. Move report generation and future tax assessment into `tax/`.
6. Replace global DI with explicit composition.
7. Remove old global layer folders after all references move.

## Open Product Decision

Manual adjustment semantics must be finalized before implementation:

1. Adjustment applies from a date forward and later entries continue from the adjusted state.
2. Adjustment is a final override for the selected year.

The first option is more ledger-like and auditable. The second option is simpler for a year-end
declaration workflow. The chosen rule should be reflected in the UI copy and projector tests.
