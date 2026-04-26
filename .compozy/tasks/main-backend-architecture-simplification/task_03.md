---
status: pending
title: Convert Portfolio IPC Contracts And Main Handlers To IpcResult
type: backend
complexity: high
dependencies:
  - task_02
---

# Task 3: Convert Portfolio IPC Contracts And Main Handlers To IpcResult

## Overview

This task migrates the existing portfolio IPC surface to the new result envelope in the main
process. It changes the shared portfolio contract output types, flips portfolio contracts to
result mode, and wires portfolio handlers and registrars so successful use cases return
`ok: true` responses.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST convert only portfolio IPC APIs listed in the TechSpec to `IpcResult<T>`.
- MUST set portfolio IPC contracts to result mode.
- MUST wrap successful portfolio handler outputs as `ok: true` results.
- MUST wire portfolio registrar error mapping for every portfolio contract.
- MUST preserve use-case behavior and avoid adding correction APIs or `position_adjustments`.
</requirements>

## Subtasks

- [ ] 3.1 Wrap shared portfolio contract result aliases in `IpcResult<T>`.
- [ ] 3.2 Change portfolio IPC contracts from throw mode to result mode.
- [ ] 3.3 Update portfolio handlers to return success envelopes for all current operations.
- [ ] 3.4 Wire portfolio registrar error mapping for all portfolio contracts.
- [ ] 3.5 Add or update main-process tests for portfolio registration and handler results.
- [ ] 3.6 Verify import, report, broker, and app IPC contracts are not broadly migrated.

## Implementation Details

Update the portfolio IPC boundary after task 02 provides typed result mapping. `recalculatePosition`
currently resolves with no payload, so its success result must represent an empty payload
consistently with the shared `IpcResult` primitive. The preload bridge should not need runtime
changes because it forwards `ipcRenderer.invoke` responses unchanged, but `ElectronApi` types may
need alignment for raw result envelopes.

### Relevant Files

- `src/shared/ipc/contracts/portfolio/contracts.ts` — portfolio contract schemas, output types, and `errorMode`.
- `src/shared/contracts/list-positions.contract.ts` — portfolio list output alias.
- `src/shared/contracts/initial-balance.contract.ts` — initial balance command/result alias.
- `src/shared/contracts/recalculate.contract.ts` — recalculation command/result alias.
- `src/shared/contracts/migrate-year.contract.ts` — year migration command/result alias.
- `src/shared/contracts/import-consolidated-position.contract.ts` — consolidated position preview/import aliases.
- `src/shared/contracts/delete-position.contract.ts` — delete position command/result alias.
- `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.ts` — portfolio handler output mapping.
- `src/main/ipc/registrars/portfolio-ipc-registrar.ts` — portfolio contract binding.

### Dependent Files

- `src/shared/types/electron-api.ts` — renderer API type surface receives portfolio `IpcResult<T>` outputs.
- `src/shared/ipc/contracts/ipc-contract-registry.ts` — aggregate contract registry must remain valid.
- `src/shared/ipc/contracts/ipc-contract-registry.test.ts` — verifies contract registry behavior.
- `src/main/ipc/registrars/brokers-ipc-registrar.ts` — reference pattern for registrar-level result error mapping.
- `src/main/ipc/registrars/brokers-ipc-registrar.test.ts` — test pattern for registrar result-mode failures.
- `src/preload-bridge/build-electron-api.ts` — should remain runtime-compatible with raw invoke results.

### Related ADRs

- [ADR-003: Migrate Portfolio IPC to IpcResult](adrs/adr-003.md) — Directly implemented by this task.
- [ADR-004: Defer Portfolio Corrections To Phase 2](adrs/adr-004.md) — Excludes correction endpoints from this task.

## Deliverables

- Portfolio shared contract result aliases wrapped in `IpcResult<T>`.
- Portfolio IPC contracts configured for result mode.
- Portfolio handlers and registrar returning success/failure result envelopes.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for portfolio IPC registration and contract registry compatibility **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] `listPositions` handler returns `ok: true` with mapped list data and preserved asset types.
  - [ ] `setInitialBalance` handler returns `ok: true` with the use-case output data.
  - [ ] `recalculatePosition` handler returns `ok: true` with the agreed empty payload.
  - [ ] Portfolio registrar maps a use-case failure to `ok: false` through the shared mapper.
  - [ ] Portfolio contracts all have `errorMode: result`.
- Integration tests:
  - [ ] IPC contract registry still exposes unique renderer API names and channels after portfolio migration.
  - [ ] Preload bridge tests still pass without runtime changes to invocation forwarding.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- All current portfolio IPC APIs return `IpcResult<T>` from the main-process boundary.
- No new correction persistence, projection, or renderer API is introduced.
