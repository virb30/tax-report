---
status: completed
title: "Complete Wiring and Boundary Cleanup"
type: refactor
complexity: critical
dependencies:
  - task_02
  - task_03
  - task_04
---

# Complete Wiring and Boundary Cleanup

## Overview
This task closes the refactor by removing legacy wiring paths, eliminating service-locator remnants, enforcing the new import boundaries, and proving the full regression suite still passes. It is the final structural cleanup step that turns the new `src/ipc` and modular bootstrap architecture into an enforced repository boundary rather than an informal convention.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. The final startup and registration wiring MUST stop using the exported global container and MUST remove `container.resolve(...)` service-locator patterns from the main bootstrap path.
2. Legacy public-boundary paths under `src/preload/contracts/**`, `src/preload/main/**`, and renderer imports from `src/shared/types/domain.ts` MUST be removed once the replacement paths are stable.
3. Import-boundary enforcement MUST be added so renderer code cannot import internal shared-domain/API modules and application code cannot import from `src/ipc/**` directly.
4. Main, preload, renderer, and test wiring MUST compile and run end to end against the new boundary layout without temporary compatibility exports.
5. The full validation gate for this refactor MUST include task validation plus focused lint/test evidence with at least 80% coverage on changed modules.
</requirements>

## Subtasks
- [x] 5.1 Replace remaining startup and bootstrap call sites with the new root bootstrap API and remove global-container access.
- [x] 5.2 Remove leftover legacy imports, dead exports, and obsolete preload/shared boundary files made redundant by earlier tasks.
- [x] 5.3 Add `no-restricted-imports` or equivalent lint enforcement for renderer and application boundary rules.
- [x] 5.4 Update any remaining tests, typings, or support utilities that still assume the old preload/shared/container layout.
- [x] 5.5 Run and fix the final task validation, lint, and Jest regressions required to prove the new boundaries hold.

## Implementation Details
Use the TechSpec "Impact Analysis", "Testing Approach", and "Development Sequencing" steps 7 through 9 as the final source of truth. This task should assume the new contract, public API, type ownership, and bootstrap layers already exist and should focus on deleting escape hatches and enforcing the target architecture.

This task is also where the repository-level mismatch is resolved operationally: even if older repository guidance still mentions shared contracts under `src/shared`, the completed codebase for this feature must enforce the TechSpec architecture that treats `src/ipc/public` as the only renderer-facing boundary and keeps application layers independent from IPC imports.

### Relevant Files
- `src/main/main.ts` — startup entrypoint that currently consumes the old container bootstrap shape.
- `src/main/app/infra/container/index.ts` — final cleanup point for any remaining `container.resolve(...)` service-locator usage.
- `src/renderer/vite-env.d.ts` — renderer ambient typing that should align with the final `ElectronApi` public entrypoint.
- `src/renderer/ipc/unwrap-ipc-result.ts` — renderer utility that should align with the final IPC public API pathing.
- `src/preload/preload.ts` — final preload bridge surface that should remain minimal after cleanup.
- `src/shared/types/domain.ts` — legacy shared boundary file that should be removed or left with zero public-boundary responsibility.
- `eslint.config.js` — likely lint enforcement point for `no-restricted-imports` boundary rules.

### Dependent Files
- `src/renderer/pages/ReportPage.tsx` — representative renderer consumer that must stay within the new public boundary.
- `src/renderer/pages/positions-page/use-positions-page.ts` — representative renderer hook that must stay within the new public boundary.
- `src/main/portfolio/transport/handlers/portfolio/portfolio-ipc-handlers.ts` — transport boundary that should remain the mapping layer, not the application layer.
- `src/main/ingestion/transport/handlers/import/import-ipc-handlers.ts` — transport boundary with final import cleanup implications.
- `src/main/tax-reporting/transport/handlers/report/report-ipc-handlers.ts` — transport boundary that must compile against the final contract ownership.
- `src/main/app/transport/handlers/ipc-handlers.integration.test.ts` — cross-context regression suite that should validate the final wiring.
- `.compozy/tasks/di-container-and-ipc-boundary-refactor/_tasks.md` — task master list that must validate cleanly once all task files are finalized.

### Related ADRs
- [ADR-001: Keep Awilix and Split the Main Composition Root by Context](./adrs/adr-001.md) — requires the service-locator/global-container cleanup to be complete.
- [ADR-002: Define a Dedicated IPC Public API Module and Remove Renderer Access to Shared Domain Types](./adrs/adr-002.md) — requires final boundary enforcement through curated imports and lint rules.
- [ADR-003: Keep Application Use-Case Inputs and Outputs Inside `src/main`](./adrs/adr-003.md) — requires application layers to remain independent from IPC imports after cleanup.

## Deliverables
- Final startup wiring updated to the new bootstrap API with no global container usage.
- Legacy preload/shared boundary paths removed once superseded.
- Boundary lint enforcement added for renderer and application import restrictions.
- Updated regression tests and support utilities aligned with the final architecture.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for final startup, handler registration, and renderer boundary usage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Container/bootstrap modules no longer use `container.resolve(...)` as a service-locator pattern in registration closures.
  - [ ] Lint configuration rejects renderer imports from internal shared/preload paths and rejects application imports from `src/ipc/**`.
  - [ ] Final preload typing and renderer utilities compile against the curated public IPC entrypoint.
- Integration tests:
  - [ ] Main startup path registers IPC handlers using the new bootstrap output with no global container access.
  - [ ] Renderer-facing workflows for assets, positions, initial balance, imports, brokers, and reports continue to pass using only the public IPC boundary.
  - [ ] Full task validation, targeted lint, and Jest regressions pass after legacy paths are removed.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No global container export or `container.resolve(...)` service-locator pattern remains in the bootstrap path.
- Renderer imports are constrained to the curated IPC public boundary.
- Application layers do not import from `src/ipc/**`, and lint rules enforce that boundary going forward.
