---
status: pending
title: Add Shared App Error And IPC Result Primitives
type: backend
complexity: medium
dependencies: []
---

# Task 1: Add Shared App Error And IPC Result Primitives

## Overview

This task creates the reusable error and result primitives that portfolio IPC will use in the MVP.
It establishes the shared shape for typed success and failure responses without changing any
portfolio contracts yet.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST define reusable `AppErrorKind`, `AppError`, and `IpcResult<T>` primitives matching the TechSpec Core Interfaces.
- MUST keep the new primitives independent from portfolio-specific contracts.
- MUST provide helpers or types that allow future import/report migrations to reuse the same result envelope.
- MUST avoid changing existing portfolio IPC behavior in this task.
- SHOULD preserve the current legacy broker `{ success, error }` result shape until later tasks explicitly touch it.
</requirements>

## Subtasks

- [ ] 1.1 Add shared app error primitives for known backend failures.
- [ ] 1.2 Add shared IPC result primitives for success and failure envelopes.
- [ ] 1.3 Add focused tests for result and error construction behavior.
- [ ] 1.4 Ensure exports are discoverable from shared IPC or shared error modules.
- [ ] 1.5 Confirm legacy broker result contracts remain unchanged.

## Implementation Details

Create or update shared files under `src/shared/` or `src/shared/ipc/` so the primitives can be
imported by main-process IPC binding and shared contract types. See the TechSpec "Core Interfaces"
section for the exact conceptual model; do not introduce portfolio-specific names here.

### Relevant Files

- `src/shared/ipc/contract-types.ts` — existing IPC contract metadata and output type plumbing.
- `src/shared/ipc/define-ipc-contract.ts` — existing contract helper that should continue to work with wrapped outputs.
- `src/shared/contracts/brokers.contract.ts` — legacy `{ success, error }` result shape that must not be accidentally migrated.
- `src/main/ipc/binding/ipc-error-mapper.ts` — future consumer of the new shared result primitives.

### Dependent Files

- `src/main/ipc/binding/bind-ipc-contract.ts` — will use the primitives in the next task.
- `src/shared/ipc/contracts/portfolio/contracts.ts` — will wrap portfolio outputs in later tasks.
- `src/shared/types/electron-api.ts` — will expose raw `IpcResult<T>` responses after portfolio contract migration.

### Related ADRs

- [ADR-003: Migrate Portfolio IPC to IpcResult](adrs/adr-003.md) — Defines the MVP result-envelope direction.
- [ADR-004: Defer Portfolio Corrections To Phase 2](adrs/adr-004.md) — Keeps this task scoped to error infrastructure, not corrections.

## Deliverables

- Shared `AppError`, `AppErrorKind`, and `IpcResult<T>` primitives.
- Shared helpers or exports needed by IPC binding and contracts.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for shared contract compatibility **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Creating an `AppError` preserves `code`, `message`, `kind`, and optional `details`.
  - [ ] Creating a success result preserves the supplied data payload.
  - [ ] Creating a failure result preserves the supplied error code, message, kind, and details.
  - [ ] Type-level usage allows `IpcResult<void>` or an equivalent undefined success payload.
- Integration tests:
  - [ ] Existing IPC contract definitions can still infer output types when the output is an `IpcResult<T>`.
  - [ ] Legacy broker result contract types remain unchanged and do not depend on `IpcResult<T>`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Shared error/result primitives are available to main IPC and shared contracts.
- No portfolio, broker, import, report, or renderer behavior changes in this task.
