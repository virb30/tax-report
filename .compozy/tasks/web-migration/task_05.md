---
status: pending
title: Move Frontend Code and Define API Boundary
type: frontend
complexity: high
dependencies:
  - task_01
---

# Task 05: Move Frontend Code and Define API Boundary

## Overview
Move the React renderer into the independent `frontend/src` project and define the frontend-owned API boundary. This prepares the UI to stop importing Electron IPC types while keeping workflow behavior unchanged until the HTTP conversion task.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST move React application source, renderer tests, styles, and frontend config into `frontend/src`.
2. MUST define frontend-owned API service interfaces and DTO types under the frontend project.
3. MUST NOT import backend DTOs, backend Zod schemas, or IPC contract modules into the frontend API boundary.
4. MUST keep React page and hook test behavior available after the move.
5. MUST preserve existing UI workflow behavior during the structural move.
6. SHOULD keep frontend service mocks centralized so later workflow conversion can replace `window.electronApi` consistently.
</requirements>

## Subtasks
- [ ] 5.1 Move renderer source, styles, HTML, and tests into `frontend/src`.
- [ ] 5.2 Move frontend Vite, TypeScript, Jest, ESLint, Tailwind, PostCSS, and component configuration into `frontend/`.
- [ ] 5.3 Add frontend-owned `TaxReportApi` interface and request/response types.
- [ ] 5.4 Add frontend API mock utilities for component and hook tests.
- [ ] 5.5 Remove frontend compile-time imports from backend and IPC internals.
- [ ] 5.6 Run and repair frontend tests after source relocation.

## Implementation Details
Follow the TechSpec "Project Structure and Documentation", "Core Interfaces", and "Testing Approach" sections. This task defines the frontend API boundary, but the real fetch implementation and workflow rewiring belong to the next frontend task.

### Relevant Files
- `src/renderer/App.tsx` - current app composition and workflow navigation.
- `src/renderer/main.tsx` - current renderer entrypoint.
- `src/renderer/pages/**` - current workflow pages, hooks, components, and tests.
- `src/renderer/services/api/list-brokers.ts` - only existing service wrapper around `window.electronApi`.
- `src/renderer/vite-env.d.ts` - currently exposes `window.electronApi`.
- `vite.renderer.config.ts` - current renderer Vite configuration.
- `tailwind.config.ts` - current frontend style configuration.
- `postcss.config.cjs` - current frontend CSS processing configuration.

### Dependent Files
- `frontend/package.json` - must include React, Vite, test, and frontend tooling dependencies.
- `frontend/src/services/**` - frontend API boundary and mocks to create.
- `frontend/src/types/**` - frontend-owned DTO types to create.
- `frontend/jest.config.ts` - must discover moved `*.test.tsx` files.
- `frontend/vite.config.ts` - must build the browser app from `frontend/src`.

### Related ADRs
- [ADR-004: Keep Backend and Frontend Schemas Independent](adrs/adr-004.md) - Requires frontend-owned API types and no shared schema package.
- [ADR-007: Split Backend and Frontend into Independent Projects](adrs/adr-007.md) - Requires frontend code, dependencies, config, and tests under `frontend/`.

## Deliverables
- React app moved to `frontend/src` with local frontend config.
- Frontend-owned `TaxReportApi` interface and request/response types.
- Frontend test mocks for the API boundary.
- Renderer tests running from `frontend/`.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for frontend project build/test wiring **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] App navigation test renders moved workflow tabs from `frontend/src`.
  - [ ] API boundary type tests verify frontend service mocks satisfy `TaxReportApi`.
  - [ ] Existing page tests for brokers, assets, positions, monthly tax, initial balance, and report pass after relocation.
  - [ ] Frontend lint rejects imports from backend, preload, and IPC internals.
- Integration tests:
  - [ ] Frontend `npm test` runs moved React tests from `frontend/`.
  - [ ] Frontend build compiles the browser app without root renderer config.
  - [ ] Frontend tests use API boundary mocks instead of root project setup.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- `frontend/src` contains the browser app and tests.
- Frontend API boundary exists without importing backend or IPC contracts.
- Existing UI behavior remains available after the structural move.
