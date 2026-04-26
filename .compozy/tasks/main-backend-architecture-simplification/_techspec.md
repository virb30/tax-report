# Main Backend Architecture Simplification TechSpec

## Executive Summary

The MVP simplifies backend reliability by standardizing portfolio IPC failure semantics and making
the affected backend ownership clearer without implementing portfolio correction behavior. Manual
position corrections, `position_adjustments`, adjustment projection, audit UI, and annual report
override behavior move to Phase 2.

The primary trade-off is that the MVP becomes infrastructure-focused and delays direct correction
value. In return, Phase 2 correction work can build on predictable `IpcResult<T>` contracts, shared
error mapping, and a narrower portfolio boundary.

## System Architecture

### Component Overview

- Shared error model: defines `AppError`, `AppErrorKind`, and `IpcResult<T>`.
- IPC binding/result mapper: converts payload validation failures, known app errors, and unknown
  errors into consistent result envelopes.
- Portfolio IPC contracts: migrate existing portfolio APIs from mixed throw behavior to
  `IpcResult<T>`.
- Portfolio renderer flows: unwrap portfolio results while preserving current behavior for
  positions, initial balance, recalculation, migration, consolidated position import, and delete.
- Future correction boundary: documented for Phase 2 only; no correction storage, projection, or UI
  is implemented in MVP.

No `position_adjustments` table, correction IPC contract, adjustment query, or annual report
override is added in Phase 1.

## Implementation Design

### Core Interfaces

```ts
export type AppErrorKind =
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'business'
  | 'unexpected';

export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly kind: AppErrorKind,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
```

```ts
export type IpcResult<T> =
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

### Data Models

No new database schema is added in MVP.

Existing shared contract outputs remain behaviorally equivalent but portfolio IPC responses are
wrapped in `IpcResult<T>`.

Example:

```ts
export type ListPositionsResult = IpcResult<{
  items: PositionListItem[];
}>;
```

Correction data model notes for Phase 2:

- Use `position_adjustments`.
- Store a domain-controlled `type`, with `manual` as the first type.
- Recalculate transactions/imported state first, then apply adjustments as the final year-end
  override layer.

### API Endpoints

These are Electron IPC contracts, not HTTP endpoints.

Convert existing portfolio APIs to `IpcResult<T>`:

- `setInitialBalance`
- `listPositions`
- `recalculatePosition`
- `migrateYear`
- `previewConsolidatedPosition`
- `importConsolidatedPosition`
- `deletePosition`

Payload validation failures return:

- `ok: false`
- `code: INVALID_PAYLOAD`
- `kind: validation`

Known `AppError` values preserve `code`, `message`, `kind`, and `details`. Unknown errors return a
generic user-facing unexpected error.

## Integration Points

No external services are added. The implementation stays inside Electron IPC, preload bridge, React
renderer, and the existing main-process portfolio use cases.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `src/shared` IPC/error types | new/modified | Adds shared result and app error primitives | Add focused type and mapper tests |
| `src/main/ipc/binding` | modified | Maps contract errors into result envelopes | Extend binder tests |
| `src/shared/ipc/contracts/portfolio` | modified | Portfolio APIs return `IpcResult<T>` | Update contract registry tests |
| `src/main/ipc/handlers/portfolio` | modified | Wraps portfolio use-case outputs in success results | Update handler tests |
| `src/renderer` portfolio consumers | modified | Unwraps portfolio result envelopes | Update renderer tests |
| Portfolio correction logic | deferred | No MVP implementation | Capture in Phase 2 tasks |

## Testing Approach

### Unit Tests

- IPC mapper converts Zod payload errors into validation results.
- IPC mapper preserves known `AppError` values.
- IPC mapper converts unknown errors into generic unexpected failures.
- Portfolio handlers return `{ ok: true, data }` for successful use-case calls.
- Renderer helpers/hooks unwrap success and failure results correctly.

### Integration Tests

- Portfolio IPC contract registry still exposes unique renderer API names and channels.
- Existing portfolio application contract tests keep behavior stable after result wrapping.
- Renderer tests cover current positions, initial balance, migration, consolidated import,
  recalculation, and delete flows under `IpcResult<T>`.

## Development Sequencing

### Build Order

1. Add shared `AppError`, `AppErrorKind`, and `IpcResult<T>` types - no dependencies.
2. Add result mapping helpers for validation, known app errors, and unknown errors - depends on
   step 1.
3. Extend IPC binding support for portfolio result-mode contracts - depends on step 2.
4. Convert portfolio IPC contracts to `IpcResult<T>` - depends on step 3.
5. Update portfolio IPC handlers and registrars to return result envelopes - depends on step 4.
6. Update `ElectronApi` and renderer portfolio call sites to unwrap results - depends on step 5.
7. Update tests for IPC binding, contract registry, portfolio handlers, and renderer flows -
   depends on steps 4 through 6.
8. Document Phase 2 correction boundary in task notes or follow-up tasks - depends on step 7.

### Technical Dependencies

- Existing Awilix container remains in use.
- Existing portfolio repositories and use cases remain in place.
- Existing `positions` and annual report behavior remains unchanged.
- No new external packages are required.

## Monitoring and Observability

This is a local Electron app, so no service monitoring is required. MVP observability is the typed
failure envelope itself: renderer code can display user-facing messages without stack traces, while
tests verify expected error kinds and codes.

## Technical Considerations

### Key Decisions

- Decision: Defer portfolio corrections to Phase 2.
  Rationale: Keeps MVP focused on backend risk reduction.
  Trade-off: Users do not receive correction behavior in Phase 1.
  Alternatives rejected: correction-first MVP, storage-only correction groundwork, no backend
  change.

- Decision: Convert portfolio IPC APIs to `IpcResult<T>`.
  Rationale: Portfolio workflows are the current high-change surface and future correction entry
  point.
  Trade-off: Renderer hooks and tests need coordinated updates.

- Decision: Do not add `position_adjustments` in MVP.
  Rationale: Avoids unused storage and unresolved projection behavior.
  Trade-off: Phase 2 still needs correction persistence and projection implementation.

### Known Risks

- MVP could become infrastructure-only.
  Mitigation: keep scope tied to observable portfolio failure behavior and contract tests.

- Portfolio-wide `IpcResult<T>` migration can miss renderer call sites.
  Mitigation: update `ElectronApi` types and renderer tests together.

- Deferred correction decisions may be lost.
  Mitigation: ADR-004 preserves the Phase 2 direction, and ADR-002 remains as superseded design
  context.

## Architecture Decision Records

- [ADR-001: Prioritize Portfolio Correction Auditability](adrs/adr-001.md) — Superseded by
  ADR-004.
- [ADR-002: Store Corrections as Position Adjustments](adrs/adr-002.md) — Superseded by ADR-004
  and retained as Phase 2 design context.
- [ADR-003: Migrate Portfolio IPC to IpcResult](adrs/adr-003.md) — Portfolio IPC APIs return typed
  result envelopes for consistent failure handling.
- [ADR-004: Defer Portfolio Corrections To Phase 2](adrs/adr-004.md) — MVP focuses on backend
  error consistency and keeps correction behavior out of scope.
