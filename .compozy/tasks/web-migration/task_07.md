---
status: pending
title: Update Web Project Documentation
type: docs
complexity: medium
dependencies:
  - task_03
  - task_05
  - task_06
---

# Task 07: Update Web Project Documentation

## Overview
Update repository and project documentation for the new web product structure. The documentation must explain how to work in the independent backend and frontend projects, how sensitive data is handled, and what Phase 1 SQLite and verification constraints mean.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST update the root README to describe Tax Report as a web product repository with independent backend and frontend projects.
2. MUST add or update `backend/README.md` with backend setup, runtime configuration, SQLite Phase 1 constraints, commands, and API verification guidance.
3. MUST add or update `frontend/README.md` with frontend setup, browser app commands, API base URL configuration, and web workflow verification guidance.
4. MUST document privacy and security expectations for sensitive financial and tax data.
5. MUST document that desktop data migration and offline-first behavior are out of scope for Phase 1.
6. SHOULD document how to run unit, API integration, and browser E2E verification before desktop distribution is retired.
</requirements>

## Subtasks
- [ ] 7.1 Update root README for repository orientation and project entry points.
- [ ] 7.2 Add backend README covering setup, scripts, runtime config, SQLite, logging, and API tests.
- [ ] 7.3 Add frontend README covering setup, scripts, API configuration, browser imports, and frontend tests.
- [ ] 7.4 Document Phase 1 privacy, security, data-handling, and SQLite limitations.
- [ ] 7.5 Document the verification gate for unit, API integration, and browser E2E tests.
- [ ] 7.6 Remove or clearly mark obsolete desktop setup and packaging instructions.

## Implementation Details
Follow the PRD "High-Level Technical Constraints", "Phased Rollout Plan", "Risks and Mitigations", and the TechSpec "Project Structure and Documentation" sections. Documentation should describe expected commands and boundaries, not implementation code.

### Relevant Files
- `README.md` - current root README describes a desktop application and Electron commands.
- `backend/README.md` - backend-local documentation to create or update.
- `frontend/README.md` - frontend-local documentation to create or update.
- `.compozy/tasks/web-migration/_prd.md` - source of product goals, scope, and rollout constraints.
- `.compozy/tasks/web-migration/_techspec.md` - source of implementation structure and verification expectations.

### Dependent Files
- `backend/package.json` - documented backend scripts must match real scripts.
- `frontend/package.json` - documented frontend scripts must match real scripts.
- `backend/src/http/**` - documented API behavior should align with implemented endpoints.
- `frontend/src/services/**` - documented API base URL behavior should align with frontend client configuration.

### Related ADRs
- [ADR-001: Replace Desktop Distribution with a Web Product](adrs/adr-001.md) - Defines web product replacement and no Phase 1 desktop data migration.
- [ADR-003: Keep Server-Side SQLite for Phase 1](adrs/adr-003.md) - Requires documenting SQLite constraints.
- [ADR-006: Require Unit, API Integration, and Browser E2E Verification](adrs/adr-006.md) - Defines verification gate.
- [ADR-007: Split Backend and Frontend into Independent Projects](adrs/adr-007.md) - Defines independent project documentation needs.

## Deliverables
- Root README updated for the web migration structure.
- Backend README with setup, scripts, runtime config, SQLite constraints, privacy, and API verification.
- Frontend README with setup, scripts, API configuration, browser imports, privacy, and E2E verification.
- Obsolete desktop distribution instructions removed or marked as transitional until final retirement.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for documentation command accuracy **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Documentation references existing backend script names from `backend/package.json`.
  - [ ] Documentation references existing frontend script names from `frontend/package.json`.
  - [ ] Documentation includes privacy guidance for uploaded CSV/XLSX contents, tax rows, CNPJ values, and financial data.
  - [ ] Documentation states desktop data migration and offline-first operation are out of scope for Phase 1.
- Integration tests:
  - [ ] Backend documented verification command runs successfully from `backend/`.
  - [ ] Frontend documented verification command runs successfully from `frontend/`.
  - [ ] Documentation links to PRD, TechSpec, and ADR files resolve from the repository root.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- A maintainer can enter `backend/` or `frontend/` and run the documented setup and verification commands.
- Documentation no longer presents Electron packaging as the active product path.
- Phase 1 privacy, SQLite, and verification constraints are explicit.
