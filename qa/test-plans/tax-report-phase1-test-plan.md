# Journey Test Plan: Tax Report Phase 1 Web QA

## Executive Summary

- **User value delivered:** The browser product should let a Brazilian investor import brokerage activity, maintain starting balances, review monthly tax outcomes, and generate the annual assets report without relying on the retired desktop workflow.
- **Personas affected:** New User, Casual User, Power User, Recovering User, Mobile User, Accessibility-Reliant.
- **Journeys exercised:** 5 primary journeys and 1 regression canary.
- **Highest user-impact risk:** A broken handoff between frontend and backend can leave the user with a navigable shell that cannot complete tax workflows, which is `Blocks-Completion` on every P0 journey.

## Planning Notes

- Repository gap: `.agents/skills/qa-execution/references/user-personas.md`, `journey-maps.md`, `user-edge-cases.md`, and `bug-severity-by-user-impact.md` are referenced by the skills but absent in this repository snapshot.
- This plan uses the skill-defined six-persona taxonomy and derives journeys from `frontend/src/App.tsx`, `frontend/src/App.e2e.test.tsx`, `backend/src/http/routes/workflow-routes.integration.spec.ts`, and project READMEs.
- Browser-driving via `agent-browser` is unavailable in this environment. Manual browser execution is therefore blocked unless an external browser tool is provided.

## Personas Covered

- **New User** — relevant for first-time broker setup and first import. Covered by `SMOKE-001`, `TC-JOURNEY-001`, and `TC-REG-001`.
- **Casual User** — relevant for low-frequency tax review and annual report generation. Covered by `TC-JOURNEY-004` and `TC-CFR-001`.
- **Power User** — relevant for repeated imports and multi-step data maintenance. Covered by `TC-JOURNEY-001` and `TC-JOURNEY-002`.
- **Recovering User** — relevant for monthly tax repair and blocked-state recovery. Covered by `TC-JOURNEY-003` and `TC-CFR-002`.
- **Mobile User** — relevant for responsive parity only. Coverage is planned in CFR scope but execution is blocked because no browser automation session is available.
- **Accessibility-Reliant** — relevant for keyboard/focus/label quality. Coverage is planned in CFR scope but deep assistive-tech execution is blocked in this run.

## Journeys Mapped

- **J-01 Import transactions and confirm the preview**
  - Value: the user converts a brokerage file into reviewed portfolio activity without touching the backend directly.
  - Persona: Power User primary, New User secondary.
  - Charters: `CH-01`.
  - Test cases: `SMOKE-001`, `TC-JOURNEY-001`.
  - Cross-feature touchpoints: frontend import page, file upload, backend multipart routes, broker lookup.
  - Abandonment paths: empty file selection, invalid preview payload, backend validation failure.

- **J-02 Register or edit starting balance and verify positions**
  - Value: the user establishes the portfolio baseline required for later tax and report workflows.
  - Persona: Power User primary, Casual User secondary.
  - Charters: `CH-01`.
  - Test cases: `TC-JOURNEY-002`.
  - Cross-feature touchpoints: initial balances, brokers, consolidated positions.
  - Abandonment paths: missing allocation, invalid quantity, edit-after-save replacement.

- **J-03 Review monthly tax history and follow a repair CTA**
  - Value: the user understands whether a month is blocked, below threshold, or closed and can navigate directly to the repair surface.
  - Persona: Recovering User primary, Casual User secondary.
  - Charters: `CH-02`.
  - Test cases: `TC-JOURNEY-003`, `TC-CFR-002`.
  - Cross-feature touchpoints: monthly tax history, monthly detail, assets repair handoff.
  - Abandonment paths: empty history, detail fetch error, blocked reason without usable CTA.

- **J-04 Generate the annual assets report and copy declaration text**
  - Value: the user reaches declaration-ready output for year-end reporting.
  - Persona: Casual User primary, Power User secondary.
  - Charters: `CH-03`.
  - Test cases: `TC-JOURNEY-004`, `TC-CFR-001`.
  - Cross-feature touchpoints: report generation, assets catalog repair, clipboard copy.
  - Abandonment paths: no positions for the base year, pending asset metadata, clipboard write failure.

- **J-05 Maintain brokers required by all import and reporting workflows**
  - Value: the user can create, edit, and toggle broker records without corrupting downstream flows.
  - Persona: New User primary, Power User secondary.
  - Charters: `CH-01`.
  - Test cases: `TC-REG-001`.
  - Cross-feature touchpoints: brokers catalog, import prerequisites, initial balance allocations.
  - Abandonment paths: validation failure on create, update error, active/inactive toggle confusion.

- **J-06 Regression canary: backend workflow routes remain reachable**
  - Value: the browser product still has a valid server contract behind `/api`.
  - Persona: n/a user-visible infrastructure canary.
  - Charters: none.
  - Test cases: `TC-REG-001` via frontend canary and backend integration command in execution matrix.
  - Cross-feature touchpoints: all public workflow routes.
  - Abandonment paths: none; this is a route-contract canary.

## Charters Planned

- **CH-01:** Power User x Charter-With-Tour x 60 min on import, starting balance, and broker prerequisites. Surface: `Importacao e Conferencia`, `Saldo Inicial`, `Corretoras`.
- **CH-02:** Recovering User x Scenario-Based x 60 min on monthly blocked-state diagnosis and repair redirection. Surface: `Imposto Mensal` -> `Catalogo de Ativos`.
- **CH-03:** Casual User x Charter-With-Tour x 60 min on report readiness, copy behavior, and pending-asset repair affordances. Surface: `Relatorio Bens e Direitos`.

## CFR Scope

- **Usability:** yes. `TC-CFR-001`.
- **Accessibility:** yes in planning, but manual execution is blocked without a browser/AT session.
- **Perceived-Performance:** yes in planning, but browser timing evidence is blocked in this run.
- **Compatibility:** yes in planning, but multi-browser validation is blocked in this run.
- **Error-Recoverability:** yes. `TC-CFR-002`.
- **Production-Parity:** yes. `TC-CFR-003`.

## Test Strategy

- Establish baseline health with project-defined install, lint, build, and test commands in `backend/` and `frontend/`.
- Exercise public API behavior through backend integration tests and direct HTTP requests once the backend is running.
- Use repository-owned workflow tests as automated public-flow evidence:
  - `frontend/src/App.e2e.test.tsx`
  - `backend/src/http/routes/workflow-routes.integration.spec.ts`
- Attempt live browser validation only if a reachable frontend dev server and browser-driving tool exist. Otherwise record the browser step as blocked instead of inventing proof.
- Stop using mocks as proof at the repository boundary; mocked component tests remain supporting evidence only.

## Automation Strategy

| Journey | Classification | Rationale |
|---------|----------------|-----------|
| J-01 Import transactions | E2E candidate | Public P0 browser flow with existing workflow spec path `frontend/src/App.e2e.test.tsx` |
| J-02 Starting balance and positions | E2E candidate | Public P0 browser flow; current coverage is partial through workflow/spec tests |
| J-03 Monthly tax repair | E2E candidate | Public P0 browser flow with existing workflow coverage in `App.e2e.test.tsx` |
| J-04 Annual report generation | E2E candidate | Public P1 browser flow with existing workflow coverage in `App.e2e.test.tsx` |
| J-05 Broker management | Missing | Public prerequisite flow; repo has test support but no single end-to-end journey spec proving full app integration |
| Responsive and AT-specific checks | Manual-only | Requires real browser and human judgment |

## Entry Criteria

- [x] Build instructions are documented for `backend/` and `frontend/`.
- [ ] CI gate status separately confirmed green.
- [x] Test data can be synthetic and local.
- [x] Personas, journeys, and charters are documented.
- [ ] Browser tooling (`agent-browser`) is available when Web UI is in scope.

## Exit Criteria

- [ ] Every P0 journey reached its goal observable.
- [ ] Zero open `Blocks-Completion` or `Data-Loss` bugs on P0 journeys.
- [ ] CFR pass completed on at least 2 journeys with no critical findings open.
- [ ] Automation follow-up registered for every `Missing` or `Blocked` annotation.
- [ ] Verification report filed at `qa/verification-report.md`.

## Retesting vs Regression

- **Retesting:** rerun the narrow failing command or flow when a discovered defect is fixed.
- **Regression:** rerun the targeted suite in `qa/test-plans/phase1-targeted-regression.md` to prove adjacent journeys still work.

## Risk Assessment

| Risk | Probability | User Impact | Mitigation |
|------|-------------|-------------|------------|
| Frontend shell loads but `/api` integration is unavailable in local runtime | high | Blocks-Completion | Run backend health checks, frontend build/test gate, and live URL verification |
| Multipart import accepts bad payloads or silently fails | medium | Trust-Damage | Run workflow integration route tests and import journey coverage |
| Monthly blocked-state CTA fails to redirect to a repairable surface | medium | Blocks-Completion | Execute `TC-JOURNEY-003` and `TC-CFR-002` |
| Annual report copy flow works only in mocked environments | medium | Trust-Damage | Record production-parity gap in `TC-CFR-003` |
| Real browser validation cannot run because tooling/server are missing | high | Conditional QA authority only | Mark browser evidence blocked and do not overclaim |

## Timeline and Deliverables

- Charters drafted by: 2026-05-13
- TC-* generated by: 2026-05-13
- Execution window: 2026-05-13
- Verification report due: 2026-05-13
