---
status: pending
title: Create Independent Backend and Frontend Project Shells
type: infra
complexity: medium
dependencies: []
---

# Task 01: Create Independent Backend and Frontend Project Shells

## Overview
Create the independent `backend/` and `frontend/` project directories required by the web migration. This establishes the repository shape from the TechSpec before source code is moved, while keeping the repository root limited to orientation and workflow material.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details - do not duplicate here
- FOCUS ON "WHAT" - describe what needs to be accomplished, not how
- MINIMIZE CODE - show code only to illustrate current structure or problem areas
- TESTS REQUIRED - every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST create `backend/` and `frontend/` as independent npm projects with their own `package.json`, TypeScript, lint, test, and format configuration.
2. MUST NOT introduce root npm workspaces, shared root runtime scripts, or shared root TypeScript configuration for backend/frontend runtime code.
3. MUST keep all future runtime source code under `backend/src` or `frontend/src`.
4. SHOULD preserve the current Node version expectation from `.nvmrc` in project-local setup instructions.
5. SHOULD keep root files focused on repository orientation, LLM rules, Compozy task assets, and cross-project documentation.
</requirements>

## Subtasks
- [ ] 1.1 Create empty `backend/` and `frontend/` project directories with local source roots.
- [ ] 1.2 Add project-local package manifests and scripts for install, build, lint, format, and test.
- [ ] 1.3 Add project-local TypeScript, Jest, ESLint, and Prettier configuration baselines.
- [ ] 1.4 Keep the repository root free of workspace coupling between backend and frontend.
- [ ] 1.5 Add minimal smoke tests proving each project test runner is wired.
- [ ] 1.6 Update ignore and generated-output patterns needed by the two independent projects.

## Implementation Details
Follow the TechSpec "Project Structure and Documentation" and "Development Sequencing" sections. This task creates only the independent project shells; moving existing backend or frontend code belongs to later tasks.

### Relevant Files
- `package.json` - current root manifest mixes Electron, backend, frontend, and test scripts.
- `tsconfig.json` - current root TypeScript configuration covers all source code.
- `jest.config.ts` - current Jest configuration already separates main and renderer projects and can guide local configs.
- `eslint.config.mjs` - current lint rules include process-specific restrictions that must become project-local.
- `README.md` - current setup instructions describe the Electron desktop project.
- `backend/package.json` - project manifest to create for backend dependencies and commands.
- `frontend/package.json` - project manifest to create for frontend dependencies and commands.

### Dependent Files
- `src/main/**` - will be moved after the backend shell exists.
- `src/renderer/**` - will be moved after the frontend shell exists.
- `src/ipc/**` - remains desktop-specific until the retirement task removes it from the active path.
- `forge.config.ts` - remains desktop-specific and must not be copied into either web project shell.

### Related ADRs
- [ADR-007: Split Backend and Frontend into Independent Projects](adrs/adr-007.md) - Requires independent project directories and no monorepo workspace model.
- [ADR-004: Keep Backend and Frontend Schemas Independent](adrs/adr-004.md) - Constrains project setup so schemas are not shared through a common package.

## Deliverables
- Independent `backend/` project shell with local config and scripts.
- Independent `frontend/` project shell with local config and scripts.
- Root configuration reduced or marked as transitional so it does not define shared runtime project behavior.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for project command wiring **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] `backend` smoke test proves the backend Jest configuration discovers and runs TypeScript tests.
  - [ ] `frontend` smoke test proves the frontend Jest configuration discovers and runs TypeScript or TSX tests.
  - [ ] Project-local TypeScript configs compile a minimal test fixture without importing across projects.
- Integration tests:
  - [ ] Running backend `npm test` from `backend/` completes without using the root Jest config.
  - [ ] Running frontend `npm test` from `frontend/` completes without using the root Jest config.
  - [ ] Running root install or scripts does not rely on npm workspaces for backend/frontend dependency management.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- `backend/` and `frontend/` can be installed and tested independently.
- No root workspace or shared root runtime config is introduced.
- Later move tasks have valid destination directories and local config targets.
