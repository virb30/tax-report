## TC-JOURNEY-003: Review monthly tax history and follow a repair CTA

**Priority:** P0
**Type:** Journey
**Status:** Not Run
**Estimated Time:** 10 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**Persona:** Recovering User
**Journey:** J-03 Review monthly tax history and follow a repair CTA
**Automation Target:** E2E
**Automation Status:** Existing
**Automation Command/Spec:** `frontend/src/App.e2e.test.tsx`
**Automation Notes:** Existing workflow spec covers blocked-month detail, CTA routing, and refresh on return.

### Journey Value

The user can understand why a month is blocked and reach the correct repair surface without losing context.

### Preconditions

- [ ] Monthly history contains at least one blocked or below-threshold month
- [ ] Detail payload exposes blocked reasons or group detail

### Real-User Conditions

| Dimension | Value |
|-----------|-------|
| Network | wifi-fast |
| Device | laptop |
| Browser | Chrome |
| Locale | pt-BR |
| Timezone | America/Sao_Paulo |
| Autofill | empty |
| Modality | mouse-keyboard |

### Test Steps

1. Open `Imposto Mensal` and inspect the month list.
   - **Expected:** The history list renders month state labels such as blocked, closed, or below threshold.
2. Open a blocked month detail.
   - **Expected:** Blocked reasons are visible with action-oriented messaging.
3. Follow the repair CTA and return to the monthly workspace.
   - **Expected:** The app lands on the mapped repair tab, shows repair context, and refreshes monthly history when navigating back.

### Edge Cases & Variations

| Variation | Action | Expected Result |
|-----------|--------|-----------------|
| Empty history | Open monthly tax with no months | Clear empty-state copy, no broken detail panel |
| Detail fetch failure | Trigger backend failure and retry | Error message surfaces; retry remains possible |
| Back after repair | Return to monthly tab | No stale blocked-state confusion |

### Post-conditions

- No cleanup required for read-only history checks
- Asset edits done through repair should be recorded separately if executed live

### Related Test Cases

- SMOKE-001: Import and monthly-tax entry sanity
- TC-CFR-002: Error recoverability on monthly tax repair

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
