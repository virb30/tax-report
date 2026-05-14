# Regression Suite: Tax Report Phase 1 Targeted

**Date:** 2026-05-13
**Scope:** Full QA pass for the current local application state
**Environment:** local `backend/` + `frontend/`

## Suite Tier

- **Smoke:** `SMOKE-001`
- **Targeted:** `TC-JOURNEY-001`, `TC-JOURNEY-002`, `TC-JOURNEY-003`, `TC-JOURNEY-004`
- **Canary:** `TC-REG-001`
- **CFR:** `TC-CFR-001`, `TC-CFR-002`, `TC-CFR-003`

## Journey Prioritization

- **P0**
  - J-01 Import transactions and confirm preview
  - J-02 Register or edit starting balance and verify positions
  - J-03 Review monthly tax history and follow a repair CTA

- **P1**
  - J-04 Generate the annual assets report and copy declaration text
  - J-05 Maintain brokers required by all import and reporting workflows

- **P2**
  - Responsive and assistive-technology checks that depend on external browser tooling

## Execution Order

1. Smoke first.
2. P0 journeys.
3. P1 journeys.
4. Manual/exploratory blockers.
5. CFR pass.

## Automation Classification

| Flow | Classification | Existing Evidence |
|------|----------------|------------------|
| Import transactions | existing-e2e | `frontend/src/App.e2e.test.tsx` |
| Initial balance and report chain | existing-e2e | `frontend/src/App.e2e.test.tsx` |
| Monthly tax repair navigation | existing-e2e | `frontend/src/App.e2e.test.tsx` |
| Backend workflow routes | existing-e2e | `backend/src/http/routes/workflow-routes.integration.spec.ts` |
| Broker management full-app journey | needs-e2e | Only page-level automation exists |
| Real browser visual/responsive checks | blocked | No `agent-browser` or Playwright session available |

## Pass / Fail / Conditional

- **PASS:** all P0 journeys reach goal, no `Blocks-Completion` or `Data-Loss`, and no critical CFR finding.
- **FAIL:** any P0 journey fails, any `Blocks-Completion` or `Data-Loss` bug appears, or production-parity evidence is invalid.
- **CONDITIONAL:** automation and browser-tooling gaps remain but the runnable local gate and public route/workflow coverage pass.

## Notes

- This regression suite uses repository-defined workflow tests as the main automated public-flow proof because the repository does not ship a standalone Playwright/Cypress harness.
- Any live browser step that cannot be executed must remain explicitly `blocked`; it must not be downgraded to pass.
