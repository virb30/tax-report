---
status: pending
title: "Extract Public IPC API"
type: refactor
complexity: high
dependencies:
  - task_01
---

# Extract Public IPC API

## Overview
This task extracts the public IPC API mechanics from `src/preload/**` into the dedicated `src/ipc/{main,renderer,public}/**` module. The goal is to leave `src/preload/preload.ts` responsible only for Electron bridge runtime while the public renderer API types, builders, registries, and main-side binding helpers live in the IPC package.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. Main-side IPC binding and registry helpers currently under `src/preload/main/**` MUST move into `src/ipc/main/**` without changing handler registration semantics.
2. Renderer-facing API typing and builders currently under `src/preload/renderer/**` MUST move into `src/ipc/renderer/**` and be re-exported through a curated `src/ipc/public` entrypoint.
3. `src/preload/preload.ts` MUST retain only the Electron bridge runtime concern of wiring `contextBridge` and `ipcRenderer` to the public IPC API.
4. Renderer and preload consumers MUST import `ElectronApi`, renderer API builders, and public IPC types from `src/ipc/public` rather than deep preload paths.
5. Tests covering preload exposure, renderer API construction, IPC binding, and IPC registry registration MUST remain in place with at least 80% coverage for affected modules.
</requirements>

## Subtasks
- [ ] 2.1 Move IPC main binding and registry infrastructure into `src/ipc/main/**`.
- [ ] 2.2 Move renderer API types and builder modules into `src/ipc/renderer/**`.
- [ ] 2.3 Create and curate `src/ipc/public` so renderer-facing imports converge on one stable entrypoint.
- [ ] 2.4 Reduce `src/preload/preload.ts` to bridge runtime only and update preload tests accordingly.
- [ ] 2.5 Update main, renderer, and test imports that still point to deep preload API infrastructure paths.

## Implementation Details
Use the TechSpec "System Architecture" and "Development Sequencing" steps 2 through 4 as the authoritative shape for the split. This task is about public API extraction and import convergence, not about moving application DTO ownership or container wiring.

Because the repository still has rule text that describes contracts under `src/shared`, keep the feature-specific override explicit in the task implementation: this feature follows the TechSpec and ADR-002 by treating `src/ipc` as the public boundary package. The new `src/ipc/public` surface should be the only renderer-approved entrypoint after this task completes.

### Relevant Files
- `src/preload/preload.ts` — the preload bridge that must be reduced to runtime-only wiring.
- `src/preload/preload.test.ts` — regression coverage for exposed API shape and channel registration assumptions.
- `src/preload/renderer/electron-api.ts` — current `ElectronApi` type definition that should become part of the IPC public API.
- `src/preload/renderer/build-electron-api.ts` — current renderer API builder that should move under `src/ipc/renderer/**`.
- `src/preload/main/binding/bind-ipc-contract.ts` — current main-side contract binder that should move under `src/ipc/main/**`.
- `src/preload/main/registry/ipc-registry.ts` — current registry aggregator that should move under `src/ipc/main/**`.
- `src/preload/main/registry/ipc-registrar.ts` — registrar abstraction currently coupled to the preload tree.

### Dependent Files
- `src/renderer/vite-env.d.ts` — currently imports `ElectronApi` from `src/preload/renderer/electron-api`.
- `src/renderer/App.e2e.test.tsx` — imports `ElectronApi` and contract types from deep preload paths.
- `src/renderer/AssetsPage.test.tsx` — representative renderer test using deep preload API typing.
- `src/renderer/InitialBalancePage.test.tsx` — representative renderer test using deep preload API typing.
- `src/renderer/PositionsPage.test.tsx` — representative renderer test using deep preload API typing.
- `src/main/app/infra/runtime/runtime.ts` — imports `IpcRegistry` and will need the new IPC module path.
- `src/main/app/infra/runtime/electron-runtime.ts` — consumes `IpcRegistry` during handler registration.

### Related ADRs
- [ADR-002: Define a Dedicated IPC Public API Module and Remove Renderer Access to Shared Domain Types](./adrs/adr-002.md) — requires a dedicated IPC package and one renderer-facing entrypoint.

## Deliverables
- IPC main helpers relocated into `src/ipc/main/**` with unchanged binding behavior.
- Renderer API typing/builders relocated into `src/ipc/renderer/**` and re-exported through `src/ipc/public`.
- `src/preload/preload.ts` reduced to Electron bridge runtime only.
- Updated imports for preload/runtime and renderer API consumers.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for preload exposure and unchanged contract binding behavior **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `buildElectronApi` still exposes the same public methods and rejects duplicate API metadata after relocation.
  - [ ] `bindIpcContract` still validates payloads and maps handler success/error behavior exactly as before.
  - [ ] `IpcRegistry` still registers every registrar against the provided `ipcMain` registry.
  - [ ] `ElectronApi` public typing remains compatible with the existing renderer contract surface.
- Integration tests:
  - [ ] `preload.test.ts` still proves `contextBridge.exposeInMainWorld('electronApi', ...)` exposes the expected methods and no raw `ipcRenderer`.
  - [ ] Runtime registration still accepts the relocated `IpcRegistry` and binds handlers without changing channel exposure.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `src/preload/preload.ts` contains only Electron bridge runtime responsibilities.
- Renderer-approved imports for `ElectronApi` and related public API artifacts go through `src/ipc/public`.
- Main-side binding and registry infrastructure no longer lives under `src/preload/main/**`.
