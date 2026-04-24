# Contract-First IPC Implementation Plan

> **Date**: 2026-04-23
> **Scope**: Refactor the Electron IPC stack to a contract-first model with main-process handlers bound to use cases and a preload bridge derived from exposed contracts
> **Status**: Proposed
> **Language/Stack**: TypeScript, Electron, React, Zod
> **Design Direction**: Pragmatic migration toward the approved target architecture, without a big-bang rewrite

---

## Executive Summary

The current IPC stack is already reasonably structured: the renderer crosses a narrow preload bridge, the main process validates payloads with Zod, and controllers remain grouped by bounded context. The remaining architectural issue is that the same operation is still represented in several places: channel constants, preload functions, the `ElectronApi` surface, controller registration, and tests. This refactor will make a shared application contract the unit of composition, then derive both the main-process registration and preload bridge from that contract.

The implementation should remain incremental. The goal is not to introduce a local framework or over-abstract Electron away from the team, but to replace duplicated transport wiring with a single contract per operation. The end state should preserve the current security model and Clean Architecture boundaries while reducing drift risk and maintenance cost.

### Desired End State

1. Every renderer-visible operation has a single shared contract that defines:
   - semantic identifier
   - transport channel
   - input schema
   - output type
   - error mode
   - public exposure metadata
2. Main-process handlers bind those contracts to use cases through a shared binder/factory.
3. The preload bridge is generated from the subset of contracts marked as renderer-visible.
4. The renderer consumes a semantic API surface, not transport details.
5. Use cases remain unaware of Electron.

### Non-Goals

1. Rewriting use cases or domain services.
2. Migrating all renderer call sites to a nested domain API in the same batch unless necessary.
3. Changing error semantics for every operation in one pass.
4. Introducing code generation, decorators, or a runtime-heavy framework.

---

## Current State

### What Exists Today

- Shared channel constants live in `src/shared/ipc/ipc-channels.ts`.
- The bridge lives in `src/preload.ts` and exposes a flat `ElectronApi`.
- The main process registers handlers via context-specific controllers in `src/main/ipc/controllers/*`.
- Validation and error wrapping are centralized in `src/main/ipc/controllers/ipc-handler.utils.ts`.
- Tests already assert preload/controller alignment and end-to-end handler wiring.

### Main Pain Points

1. A single operation still has to be represented in multiple files.
2. Channel naming and API naming are related, but not modeled as one contract.
3. Controllers still carry transport-level boilerplate even after the last cleanup.
4. `ElectronApi` is a second structural source of truth for operations.
5. Error behavior is mixed: some operations throw, others return `{ success, error }`.

---

## Target Architecture

### Architectural Principle

The central abstraction becomes the **IPC contract**, not the channel string and not the controller method.

Each contract should describe one application-facing capability and act as the single source of truth for:

- transport identity
- request validation
- response typing
- renderer exposure
- handler binding metadata

### Proposed Module Layout

```text
src/
  shared/
    ipc/
      contract-types.ts
      define-ipc-contract.ts
      ipc-contract-registry.ts
      contracts/
        app/
        brokers/
        import/
        portfolio/
        report/

  main/
    ipc/
      binding/
        bind-ipc-contract.ts
        ipc-error-mapper.ts
      handlers/
        app/
        brokers/
        import/
        portfolio/
        report/
      registry/
        ipc-contract-registry.ts

  preload/
    bridge/
      build-electron-api.ts
      exposed-contracts.ts
```

### Core Concepts

#### 1. IPC Contract

Each contract should contain:

- `id`: semantic identifier such as `brokers.create`
- `channel`: Electron transport channel
- `inputSchema`: Zod schema for renderer input
- `errorMode`: `'throw' | 'result'`
- `exposeToRenderer`: boolean
- `api`: semantic placement in the bridge, initially compatible with the current flat API

#### 2. Main Handler

Each handler should be a thin adapter from contract input to one use case. It should not know about `ipcMain`. Its job is to:

- receive validated input
- call a use case or service
- adapt the output if transport shape differs from use-case shape

#### 3. Binder

The binder should be the only Electron-specific registration utility. It should:

- register `ipcMain.handle`
- validate payloads
- apply error policy
- delegate execution to the handler

#### 4. Bridge Builder

The preload bridge should be constructed from contracts marked `exposeToRenderer`. The preload still exposes a safe explicit API, but the shape is derived from metadata instead of manual duplication.

---

## Migration Strategy

This refactor should be executed in small vertical slices. Do not migrate all contexts at once.

### Migration Rules

1. Preserve behavior before improving elegance.
2. Keep the current public `ElectronApi` stable until the contract/binder model is proven.
3. Migrate one bounded context at a time.
4. Prefer additive migration with temporary coexistence over invasive rewrites.
5. Do not remove the existing controller model until the new binder path is stable and covered by tests.

---

## Phased Implementation Plan

## Phase 1: Establish Shared Contract Primitives

### Goal

Create the minimum shared abstractions needed to define contract-first IPC without changing runtime behavior.

### Tasks

1. Add `contract-types.ts` with:
   - contract metadata types
   - error mode types
   - types for request/response inference
2. Add `define-ipc-contract.ts` as a small helper for strongly typed contract declaration.
3. Add a first registry module under `src/shared/ipc/contracts/` that can export contract lists per bounded context.
4. Keep `ipc-channels.ts` temporarily, but make it an implementation detail of the new contracts where possible.

### Deliverables

- Shared type-safe definition format for IPC contracts
- No runtime migration yet

### Verification

- `npx tsc --noEmit`
- Focused tests for contract definition typing, if practical

### Risks

- Overengineering the contract shape too early
- Encoding future needs that are not yet required

### Mitigation

- Keep the initial contract metadata minimal
- Avoid nested generic magic beyond what is needed for inference

---

## Phase 2: Introduce Main-Process Binder and Handler Model

### Goal

Separate Electron registration from operation handlers.

### Tasks

1. Add `bind-ipc-contract.ts` in `src/main/ipc/binding/`.
2. Move generic validation and error behavior out of controller-specific registration into the binder.
3. Define a handler signature that receives validated input and returns transport output.
4. Add `ipc-error-mapper.ts` or similar helper if needed to keep binder logic small.
5. Keep controllers, but make them compose contract-handler bindings instead of registering raw handlers manually.

### Deliverables

- Shared binder for contract registration
- Handler abstraction independent of `ipcMain`
- Controllers reduced to composition/orchestration

### Verification

- Existing IPC controller tests still pass
- Existing integration tests still pass
- New tests validate binder behavior for:
  - valid payload
  - invalid payload
  - throw mode
  - result mode

### Risks

- Moving too much behavior into the binder and obscuring the flow
- Making controllers pointless without removing them

### Mitigation

- Keep binder narrowly focused on transport concerns
- Keep handlers grouped by context, even if controllers become thinner

---

## Phase 3: Migrate One Context End-to-End

### Goal

Prove the model on a small bounded context before wider adoption.

### Recommended First Context

`brokers`

### Why `brokers`

- Moderate surface area
- Contains both query-like and form-like flows
- Already has divergent error behavior, making it a good test of `errorMode`
- Lower risk than `import` or `portfolio`

### Tasks

1. Define contracts for:
   - `brokers:list`
   - `brokers:create`
   - `brokers:update`
   - `brokers:toggle-active`
2. Add main-process handlers for those operations.
3. Refactor `BrokersController` to register from contract bindings instead of manual `registerValidatedHandler(...)`.
4. Preserve current response semantics.
5. Keep the preload bridge behavior unchanged for this context in this phase.

### Deliverables

- One full context running on contract-first main registration
- Existing renderer code unchanged

### Verification

- `brokers.controller.test.ts`
- `ipc-handlers.integration.test.ts`
- relevant renderer tests touching broker flows
- `npm test`

### Exit Criteria

- Adding a new broker operation requires defining one contract and one handler, not editing transport code in several layers

---

## Phase 4: Derive Preload Bridge from Exposed Contracts

### Goal

Replace manual preload duplication with bridge generation from contract metadata.

### Tasks

1. Add `build-electron-api.ts` under a preload-focused module.
2. Add metadata on contracts for:
   - renderer exposure
   - public API method name
3. Build the current flat `ElectronApi` automatically from the exposed contracts.
4. Preserve the current public bridge shape exactly in the first pass.
5. Remove direct hand-written mapping from `preload.ts`.

### Deliverables

- Bridge derived from shared contracts
- `ElectronApi` still stable for renderer consumers

### Verification

- `preload.test.ts`
- contract/bridge alignment tests
- `npx tsc --noEmit`

### Risks

- Bridge generation becoming too opaque
- Hard-to-debug failures if metadata is invalid

### Mitigation

- Keep builder simple and deterministic
- Validate duplicate API names and duplicate channels eagerly

---

## Phase 5: Migrate Remaining Contexts

### Goal

Roll the pattern out across the full main/preload IPC surface.

### Recommended Order

1. `report`
2. `app`
3. `portfolio`
4. `import`

### Rationale

- `report` and `app` are small and low risk.
- `portfolio` is larger but still mostly straightforward request/response behavior.
- `import` has more transport quirks and should move later, after the binder/bridge model is stable.

### Tasks

1. Convert each context to contracts + handlers.
2. Update controller composition per context.
3. Keep response semantics stable unless explicitly approved for cleanup.
4. Expand integration coverage as each context moves.

### Verification

- Full `npm test`
- `npm run lint`
- Focused IPC integration tests per migrated context

---

## Phase 6: Optional API Surface Cleanup

### Goal

Decide whether to move from the current flat `ElectronApi` to a domain-grouped bridge.

### Potential Target

```ts
window.electronApi.brokers.create(...)
window.electronApi.portfolio.listPositions(...)
window.electronApi.import.previewTransactions(...)
```

### Recommendation

Treat this as a separate decision after the contract-first migration is complete.

### Why It Is Optional

- It improves semantics and navigation.
- It is not required to achieve contract-first IPC.
- It would force wider renderer changes and should not be bundled into the transport refactor.

---

## Error Handling Strategy

### Short-Term Rule

Preserve existing behavior per operation.

### Medium-Term Rule

Every contract must explicitly declare:

- `errorMode: 'throw'`
- or `errorMode: 'result'`

### Long-Term Target

Revisit whether the whole renderer-facing surface should converge to a single `Result` model. That decision should happen only after the contract-first migration is stable.

---

## Testing Strategy

## Required Test Layers

### 1. Contract Definition Tests

Validate:

- unique channel names
- unique public API names within the bridge
- only renderer-exposed contracts appear in preload exports

### 2. Binder Tests

Validate:

- payload validation
- error translation
- `throw` versus `result` behavior

### 3. Context-Level Controller/Registry Tests

Validate:

- the right contracts are registered for each context
- migrated contexts still expose all expected handlers

### 4. End-to-End IPC Integration Tests

Validate:

- real execution from handler registration down to use-case behavior
- backward compatibility of current transport shapes

### 5. Renderer Contract Tests

Validate:

- preload API shape remains stable during migration
- bridge stays aligned with exposed contracts

---

## Cutover and Compatibility Strategy

### During Migration

- Old controller-style registration and new contract-first registration may coexist.
- Do not mix both approaches inside the same operation.
- It is acceptable for one context to be fully migrated while others still use the old structure.

### At Final Cutover

1. Remove old manual mappings that duplicate contract metadata.
2. Collapse compatibility layers only after all contexts are migrated.
3. Re-evaluate whether `ipc-channels.ts` should survive as a thin exported view or disappear entirely into the contract registry.

---

## Risks and Caveats

### R1: Internal framework creep

The refactor can become a local framework if contract metadata grows too large.

**Mitigation**: keep contract metadata limited to what is needed for transport composition.

### R2: Type-level complexity outpacing team ergonomics

TypeScript-heavy contract builders can become hard to maintain.

**Mitigation**: favor readable helper functions over advanced conditional-type tricks.

### R3: Mixed error semantics becoming harder to reason about

Contract-first migration may normalize everything except error behavior, leaving ambiguity.

**Mitigation**: require `errorMode` to be explicit from the first migrated context onward.

### R4: Contract and domain concerns getting mixed

Transport-specific schemas can leak into core use cases.

**Mitigation**: contracts define transport validation; handlers perform the adaptation; use cases stay application-focused.

### R5: Overcoupling preload generation to contract metadata

A too-clever bridge builder can make debugging difficult.

**Mitigation**: keep the generated shape deterministic and preserve explicit names in metadata.

---

## Suggested File-Level Changes

### New Files

- `src/shared/ipc/contract-types.ts`
- `src/shared/ipc/define-ipc-contract.ts`
- `src/shared/ipc/contracts/brokers/*.ts`
- `src/shared/ipc/contracts/import/*.ts`
- `src/shared/ipc/contracts/portfolio/*.ts`
- `src/shared/ipc/contracts/report/*.ts`
- `src/main/ipc/binding/bind-ipc-contract.ts`
- `src/main/ipc/binding/ipc-error-mapper.ts`
- `src/main/ipc/handlers/*`
- `src/preload/bridge/build-electron-api.ts`

### Files Expected to Change

- `src/preload.ts`
- `src/shared/types/electron-api.ts`
- `src/shared/ipc/ipc-channels.ts`
- `src/main/ipc/controllers/*.ts`
- `src/main/ipc/controllers/ipc-handler.utils.ts`
- `src/main/ipc/controllers/ipc-registry.ts`
- IPC-related tests in `src/preload.test.ts`, `src/main/ipc/controllers/*.test.ts`, and `src/main/ipc/handlers/ipc-handlers.integration.test.ts`

---

## Recommended Execution Order

1. Define shared contract primitives.
2. Add binder + handler model.
3. Migrate `brokers`.
4. Derive preload from exposed contracts while keeping the current public bridge shape.
5. Migrate `report` and `app`.
6. Migrate `portfolio`.
7. Migrate `import`.
8. Decide whether to introduce a domain-grouped public API as a separate follow-up.

---

## Definition of Done

This refactor is complete when all of the following are true:

1. Every renderer-visible IPC operation is declared via one shared contract.
2. Main-process registration is derived from contracts and handlers, not manual controller boilerplate.
3. The preload bridge is derived from exposed contracts.
4. Existing behavior is preserved unless a change was explicitly approved.
5. The full test suite passes.
6. `npm run lint` does not regress relative to the baseline at the start of the migration.

---

## Recommended First Implementation Batch

The first batch should be intentionally small and should prove the architecture rather than maximize migrated surface.

### Batch 1

1. Add shared IPC contract primitives.
2. Add binder infrastructure.
3. Migrate `brokers` to contract-first registration.
4. Add tests for contract uniqueness and binder behavior.
5. Keep the current manual preload bridge in place for this batch.

### Why This Is the Right Starting Point

- It proves the new center of gravity on the main-process side first.
- It avoids moving main and preload abstractions simultaneously.
- It contains the change to one context with good test coverage already in place.

---

## Final Recommendation

Implement this refactor as an incremental architecture migration, not as a rewrite. The first concrete milestone should be a successful `brokers` migration using shared contracts and main-process handlers bound through a binder, while preserving the current preload API. Only after that should the project derive the preload bridge from the exposed contracts.
