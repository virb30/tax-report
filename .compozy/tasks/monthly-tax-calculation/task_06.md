---
status: pending
title: Expose monthly close through module wiring and IPC contracts
type: backend
complexity: medium
dependencies:
  - task_05
---

# Task 06: Expose monthly close through module wiring and IPC contracts

## Overview
Connect the completed monthly close backend to the rest of the Electron app through module composition and a
coarse-grained IPC surface. This task implements the TechSpec "API Endpoints" and ADR-005 contract decisions by
registering history, detail, and recalculation operations for renderer use.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST extend `tax-reporting` module composition so it receives the shared, portfolio, and ingestion dependencies required by monthly close.
2. MUST add coarse IPC contracts for monthly history, month detail, and manual recalculation with renderer exposure enabled.
3. MUST update public renderer API typing and registration so monthly contracts are available through `window.electronApi`.
4. MUST preserve contract uniqueness, payload validation, and module startup behavior with automated tests.
</requirements>

## Subtasks
- [ ] 6.1 Expand `tax-reporting` container types and module creation inputs for monthly dependencies.
- [ ] 6.2 Define monthly close IPC contracts and export them through the shared renderer/public registries.
- [ ] 6.3 Register the new monthly handlers in `tax-reporting` and wire them into main-process module composition.
- [ ] 6.4 Add contract and container tests for handler registration, API names, and startup behavior.

## Implementation Details
Reference the TechSpec "API Endpoints" and "Impact Analysis" sections. Keep the IPC surface coarse-grained and domain
oriented: history, detail, and recalculation only.

### Relevant Files
- `src/main/tax-reporting/infra/container/index.ts` — register use cases, startup handler, and IPC bindings for monthly close.
- `src/main/app/infra/container/types.ts` — widen tax-reporting dependency definitions to include shared and ingestion seams.
- `src/ipc/contracts/tax-reporting/report/contracts.ts` — current report contract pattern to mirror for monthly close.
- `src/ipc/renderer/ipc-contract-registry.ts` — central renderer/public contract registry that must include the new contracts.

### Dependent Files
- `src/main/main.ts` — composition of `createTaxReportingModule(...)` will change when shared and ingestion dependencies are injected.
- `src/ipc/renderer/electron-api.ts` — renderer API typing must expose monthly history, detail, and recalculation methods.
- `src/ipc/public/index.ts` — public exports must include monthly close contract types for renderer code and tests.
- `src/preload/preload.ts` — exposed API build must continue to work after new contracts are added.

### Related ADRs
- [ADR-005: Keep Monthly Close in Tax Reporting with Coarse-Grained IPC](adrs/adr-005.md) — defines the monthly IPC surface and module boundary.
- [ADR-006: Keep Monthly Repair Read-Only and Route Users to Existing Flows](adrs/adr-006.md) — constrains detail payloads to navigation metadata, not inline mutations.

## Deliverables
- Expanded `tax-reporting` module composition for monthly-close dependencies.
- New monthly-close IPC contracts exported through renderer/public registries.
- Updated Electron API typing plus module and contract tests.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for monthly IPC wiring **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Monthly close contracts reject invalid `month` and `startYear` payloads through existing schema validation rules.
  - [ ] Renderer contract registry includes the monthly-close API names without duplicates.
  - [ ] `buildElectronApi` exposes the new monthly methods with the expected channel bindings.
- Integration tests:
  - [ ] `createTaxReportingModule` registers history, detail, and recalculation handlers against the IPC registry.
  - [ ] Main-process composition can initialize the monthly startup handler and register the new IPC contracts together.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Renderer code can call monthly history, detail, and recalculation through stable IPC contracts.
- Monthly close backend is fully wired into the Electron main process without breaking existing contracts.
