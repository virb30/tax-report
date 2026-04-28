---
status: pending
title: Document Phase 2 Correction Boundary And Regression Guardrails
type: docs
complexity: low
dependencies:
  - task_04
---

# Task 5: Document Phase 2 Correction Boundary And Regression Guardrails

## Overview

This task keeps the simplified MVP aligned with the PRD and ADRs after implementation changes are
complete. It documents that portfolio correction logic remains Phase 2 work and adds verification
guardrails so the MVP does not accidentally introduce correction storage, projection, or UI.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST ensure task documentation reflects that corrections are out of MVP scope.
- MUST verify no `position_adjustments` migration, correction IPC contract, or correction renderer flow was added.
- MUST preserve ADR-002 as superseded Phase 2 design context rather than active MVP scope.
- MUST include validation evidence for portfolio IPC result migration.
- SHOULD mention `cy-create-tasks` or Phase 2 task creation as the next workflow step only if new correction tasks are needed.
</requirements>

## Subtasks

- [ ] 5.1 Review PRD, TechSpec, and ADR links for consistency after implementation.
- [ ] 5.2 Verify MVP implementation did not add correction storage, correction APIs, or correction UI.
- [ ] 5.3 Add or update lightweight notes if implementation reveals Phase 2 correction follow-ups.
- [ ] 5.4 Run targeted searches for forbidden MVP correction artifacts.
- [ ] 5.5 Capture validation commands and outcomes in the task completion notes.

## Implementation Details

This is a documentation and regression-guard task, not a product implementation task. It should not
create `position_adjustments`, correction IPC channels, or renderer correction components. Reference
the TechSpec "Technical Considerations" and ADR-004 for the accepted scope boundary.

### Relevant Files

- `.compozy/tasks/main-backend-architecture-simplification/_prd.md` — MVP and Phase 2 scope.
- `.compozy/tasks/main-backend-architecture-simplification/_techspec.md` — approved implementation design.
- `.compozy/tasks/main-backend-architecture-simplification/adrs/adr-002.md` — superseded correction design context.
- `.compozy/tasks/main-backend-architecture-simplification/adrs/adr-004.md` — active decision to defer corrections.
- `src/shared/ipc/contracts/portfolio/contracts.ts` — should contain only current portfolio APIs for MVP.

### Dependent Files

- `src/main/database/migrations/index.ts` — should not register a `position_adjustments` migration in MVP.
- `src/renderer/pages/positions-page/use-positions-page.ts` — should not add correction UI workflow in MVP.
- `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.ts` — should not add correction handlers in MVP.

### Related ADRs

- [ADR-002: Store Corrections as Position Adjustments](adrs/adr-002.md) — Superseded and retained as Phase 2 context.
- [ADR-004: Defer Portfolio Corrections To Phase 2](adrs/adr-004.md) — Directly constrains this task.

## Deliverables

- Scope consistency check across PRD, TechSpec, and ADRs.
- Regression guard evidence that correction logic remains out of MVP.
- Validation notes for portfolio IPC result migration.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for scope guardrails **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Existing portfolio IPC contract tests confirm only approved portfolio APIs are exposed.
  - [ ] Existing renderer tests confirm no correction UI path is required for MVP behavior.
- Integration tests:
  - [ ] Search or validation step confirms no `position_adjustments` migration exists in MVP.
  - [ ] Search or validation step confirms no correction IPC channel exists in portfolio contracts.
  - [ ] Targeted portfolio IPC and renderer test commands pass after result migration.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- PRD, TechSpec, and ADRs consistently defer portfolio corrections to Phase 2.
- No MVP correction storage, IPC, projection, or renderer workflow exists.
