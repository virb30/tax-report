---
status: completed
title: Expose Assessment Through IPC and Container Wiring
type: infra
complexity: high
dependencies:
  - task_05
---

# Task 6: Expose Assessment Through IPC and Container Wiring

## Overview

Expose the capital gains assessment use case through the existing typed Electron IPC
pipeline and register all backend dependencies in the Awilix container. This task makes
the backend workflow available as `window.electronApi.generateCapitalGainsAssessment`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a renderer-exposed IPC contract with channel `tax-reporting:capital-gains-assessment`.
- MUST validate `{ baseYear: number }` with Zod integer validation.
- MUST expose renderer API name `generateCapitalGainsAssessment`.
- MUST bind the contract through the existing report IPC registrar/handler pattern.
- MUST register the query adapter, domain services, and use case in the Awilix container.
- MUST update preload API typing and contract registry coverage.
- MUST preserve existing `generateAssetsReport` behavior.
</requirements>

## Subtasks

- [x] 6.1 Add the capital gains IPC contract and include it in tax-reporting contract exports.
- [x] 6.2 Add the renderer API type for `generateCapitalGainsAssessment`.
- [x] 6.3 Add report IPC handler and registrar binding for the new use case.
- [x] 6.4 Register query adapter, services, and use case in the container.
- [x] 6.5 Update IPC registry, preload, registrar, and container tests.
- [x] 6.6 Verify existing asset report IPC behavior remains intact.

## Implementation Details

Follow the existing contract-first IPC pattern described in the TechSpec "API Endpoints"
section. Keep handlers thin and let validation happen through the contract binding.

### Relevant Files

- `src/preload/contracts/tax-reporting/report/contracts.ts` — Existing report contract registration pattern.
- `src/preload/contracts/tax-reporting/assets-report.contract.ts` — Existing report result contract style.
- `src/preload/ipc/ipc-contract-registry.ts` — Renderer-exposed contract aggregation.
- `src/preload/ipc/ipc-contract-registry.test.ts` — Registry behavior coverage.
- `src/preload/renderer/electron-api.ts` — Renderer API type surface.
- `src/preload/renderer/build-electron-api.ts` — Automatic API builder.
- `src/preload/preload.test.ts` — Preload exposure tests.
- `src/main/tax-reporting/transport/handlers/report/report-ipc-handlers.ts` — Existing report handler pattern.
- `src/main/tax-reporting/transport/registrars/report-ipc-registrar.ts` — Existing registrar binding pattern.
- `src/main/app/infra/container/index.ts` — Dependency registration.
- `src/main/app/infra/container/index.test.ts` — Container resolution coverage.

### Dependent Files

- `src/renderer/pages/capital-gains-page/use-capital-gains-assessment.ts` — Will call the renderer API in task 07.
- `src/renderer/pages/CapitalGainsPage.tsx` — Will depend on the API output shape.

### Related ADRs

- [ADR-003: Tax Reporting Read Model for Capital Gains Assessment](adrs/adr-003.md) — Requires render-ready IPC output and tax-reporting wiring.

## Deliverables

- New tax-reporting IPC contract for capital gains assessment.
- Renderer API typing for `generateCapitalGainsAssessment`.
- Main-process handler and registrar binding.
- Awilix container registration for the query, services, and use case.
- IPC, preload, registrar, and container tests with 80%+ coverage **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Contract rejects a missing `baseYear` payload.
  - [ ] Contract rejects a non-integer `baseYear` payload.
  - [ ] Contract metadata exposes API name `generateCapitalGainsAssessment`.
  - [ ] Report IPC handler invokes `GenerateCapitalGainsAssessmentUseCase.execute`.
- Integration tests:
  - [ ] `rendererExposedIpcContracts` includes `tax-reporting:capital-gains-assessment`.
  - [ ] Preload API exposes `generateCapitalGainsAssessment` without removing `generateAssetsReport`.
  - [ ] `ReportIpcRegistrar` binds both the asset report and capital gains contracts.
  - [ ] Container resolves the new query, services, use case, and report registrar.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Renderer can call the assessment through typed IPC.
- Existing report IPC contracts continue to pass their current tests.
