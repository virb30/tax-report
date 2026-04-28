---
status: pending
title: Extend IPC Binding For Typed Result Mapping
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 2: Extend IPC Binding For Typed Result Mapping

## Overview

This task updates the main-process IPC binding path so result-mode contracts can consistently
return typed validation, known, and unexpected failures. It prepares the binding layer for
portfolio conversion while preserving throw-mode behavior for untouched APIs.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST map invalid payloads for result-mode contracts to `IpcResult` failures with `code: INVALID_PAYLOAD` and `kind: validation`.
- MUST preserve known `AppError` code, message, kind, and details in result-mode failures.
- MUST map unknown errors to a generic unexpected result without exposing stack traces.
- MUST preserve existing throw-mode contract behavior.
- MUST not migrate portfolio contracts in this task.
</requirements>

## Subtasks

- [ ] 2.1 Update IPC payload or binding behavior so validation identity is available for result mapping.
- [ ] 2.2 Extend the IPC error mapper to produce `IpcResult` failures.
- [ ] 2.3 Update result-mode binding tests for validation, known app errors, and unknown errors.
- [ ] 2.4 Verify throw-mode binding tests still reject invalid payloads and handler failures.
- [ ] 2.5 Keep legacy broker result mapping compatible until portfolio migration is complete.

## Implementation Details

Modify the IPC binding layer only. `parseIpcPayload` currently converts `ZodError` into a plain
`Error`, so this task must either preserve structured validation failures for the binder or convert
them into an `AppError` before result mapping. See the TechSpec "API Endpoints" section for the
required failure envelope behavior.

### Relevant Files

- `src/main/ipc/binding/bind-ipc-contract.ts` — central binder for throw-mode and result-mode IPC contracts.
- `src/main/ipc/binding/ipc-payload.ts` — parses payloads and currently normalizes Zod errors to plain errors.
- `src/main/ipc/binding/ipc-error-mapper.ts` — existing legacy failure mapper and likely location for new result mapping.
- `src/main/ipc/binding/bind-ipc-contract.test.ts` — existing tests for result-mode and throw-mode behavior.
- `src/main/ipc/binding/ipc-payload.test.ts` — tests for payload parsing and validation messages.

### Dependent Files

- `src/main/ipc/registrars/brokers-ipc-registrar.ts` — existing result-mode user of legacy mapping.
- `src/main/ipc/registrars/brokers-ipc-registrar.test.ts` — protects broker legacy result behavior.
- `src/shared/ipc/contracts/portfolio/contracts.ts` — will switch to result mode in task 03.

### Related ADRs

- [ADR-003: Migrate Portfolio IPC to IpcResult](adrs/adr-003.md) — Requires typed portfolio failure mapping.
- [ADR-004: Defer Portfolio Corrections To Phase 2](adrs/adr-004.md) — Limits this work to backend error consistency.

## Deliverables

- IPC result failure mapper for validation, `AppError`, and unknown failures.
- Updated IPC binding behavior for result-mode contracts.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for binder behavior across throw-mode and result-mode contracts **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Result-mode contract with invalid payload returns `ok: false`, `code: INVALID_PAYLOAD`, and `kind: validation`.
  - [ ] Result-mode contract throwing `AppError` returns the same code, message, kind, and details.
  - [ ] Result-mode contract throwing unknown `Error` returns `kind: unexpected` with a generic message.
  - [ ] Throw-mode contract with invalid payload still rejects with the validation message.
  - [ ] Throw-mode contract with handler failure still rejects.
- Integration tests:
  - [ ] Legacy broker result-mode registration still returns the existing `{ success: false, error }` shape until migrated separately.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Result-mode contracts can use the new `IpcResult<T>` mapper.
- Untouched throw-mode and legacy broker result behavior remain stable.
