---
status: pending
title: Retire Desktop Distribution Path After Parity Gate
type: infra
complexity: critical
dependencies:
  - task_06
  - task_07
---

# Task 08: Retire Desktop Distribution Path After Parity Gate

## Overview
Remove the active Electron desktop distribution path after the web workflows meet the Phase 1 parity gate. This task ends desktop packaging, preload, IPC, and Electron runtime work as active product infrastructure while preserving only any historical documentation that remains useful.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST retire Electron Forge packaging, preload bridge, IPC runtime, BrowserWindow startup, and desktop scripts from the active product path only after web parity verification passes.
2. MUST remove active root runtime dependencies and scripts that support desktop distribution.
3. MUST ensure backend and frontend projects remain independently buildable, testable, and runnable after desktop files are removed or archived.
4. MUST verify the complete web product covers import, initial balance, positions, monthly tax, annual report, assets, and brokers.
5. MUST keep root documentation focused on web access and project orientation.
6. SHOULD preserve any non-runtime historical notes only when they do not imply active desktop support.
</requirements>

## Subtasks
- [ ] 8.1 Confirm the web parity gate has passing unit, API integration, and browser E2E evidence.
- [ ] 8.2 Remove Electron Forge, preload, IPC, BrowserWindow, and desktop startup files from active runtime code.
- [ ] 8.3 Remove desktop package scripts and desktop-only dependencies from active manifests.
- [ ] 8.4 Remove frontend and backend references to Electron APIs, IPC contracts, and desktop file paths.
- [ ] 8.5 Update documentation so all product access points route to the web product.
- [ ] 8.6 Run full backend, frontend, API integration, browser E2E, lint, and format verification.

## Implementation Details
Follow the PRD "Desktop Distribution Shutdown", "Phased Rollout Plan", and TechSpec "Development Sequencing" sections. This task should not happen until the web application has proven the full Phase 1 core workflow parity.

### Relevant Files
- `forge.config.ts` - current Electron packaging configuration.
- `vite.main.config.ts` - current Electron main process build configuration.
- `vite.preload.config.ts` - current preload build configuration.
- `src/preload/**` - current secure IPC bridge.
- `src/ipc/**` - current desktop IPC contracts, binding, and renderer API.
- `src/main/app/infra/runtime/electron-runtime.ts` - current BrowserWindow and Electron app runtime.
- `package.json` - current root desktop scripts and Electron dependencies.

### Dependent Files
- `backend/package.json` - must remain backend-only after desktop retirement.
- `frontend/package.json` - must remain frontend-only after desktop retirement.
- `README.md` - must route users and maintainers to the web product.
- `frontend/src/**` - must not reference `window.electronApi`, preload, or IPC contracts.
- `backend/src/**` - must not reference Electron runtime, preload, or IPC contracts.

### Related ADRs
- [ADR-001: Replace Desktop Distribution with a Web Product](adrs/adr-001.md) - Authorizes ending desktop distribution after parity.
- [ADR-002: Use React with an Express HTTP API](adrs/adr-002.md) - Replaces Electron IPC with HTTP.
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](adrs/adr-006.md) - Defines the required verification gate before desktop replacement.
- [ADR-007: Split Backend and Frontend into Independent Projects](adrs/adr-007.md) - Requires root project cleanup after backend/frontend independence.

## Deliverables
- Desktop distribution files removed from the active runtime path.
- Root desktop scripts and Electron dependencies removed from active package configuration.
- Documentation routes setup, support, and verification to the web backend and frontend.
- Final parity verification evidence for all seven core workflows.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for final web-only verification gate **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Static dependency test verifies active frontend and backend source do not import Electron, preload, or IPC modules.
  - [ ] Root package script test verifies desktop packaging commands are absent from active product scripts.
  - [ ] Frontend unit tests prove workflows still use HTTP API services after desktop code removal.
  - [ ] Backend unit tests prove use cases and repositories still pass after IPC removal.
- Integration tests:
  - [ ] Backend API integration suite passes for all route families.
  - [ ] Frontend browser E2E suite passes for import, initial balance, positions, monthly tax, annual report, assets, and brokers.
  - [ ] Backend and frontend lint, format, build, and test commands pass from their independent project directories.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- No active product command builds or packages Electron desktop artifacts.
- The web product is the documented and verified primary product surface.
- All seven PRD core workflows pass the web parity gate.
