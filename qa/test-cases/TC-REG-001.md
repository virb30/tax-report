## TC-REG-001: Broker management prerequisite regression

**Priority:** P1
**Type:** Regression
**Status:** Not Run
**Estimated Time:** 8 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**Persona:** New User
**Journey:** J-05 Maintain brokers required by all import and reporting workflows
**Automation Target:** E2E
**Automation Status:** Missing
**Automation Command/Spec:** `frontend/src/pages/BrokersPage.test.tsx`
**Automation Notes:** Page-level coverage exists, but there is no single app-level journey spec proving broker CRUD plus downstream reuse.

### Objective

Verify broker create, edit, and active-state changes still support downstream import and starting-balance workflows after recent changes.

### Context

Recent changes that may affect this journey:

- Browser product split across `frontend/` and `backend/`
- Workflow reliance on broker prerequisites across import and initial-balance surfaces

### Critical Path (user-language)

1. [ ] Open the broker management surface successfully
2. [ ] Create a broker with name, CNPJ, and code
3. [ ] Edit the broker and observe updated values
4. [ ] Toggle active state without losing list integrity
5. [ ] Verify at least one downstream form can still reference active brokers

### Cross-Journey Touchpoints

- [ ] J-01 import still loads broker options
- [ ] J-02 starting balance still accepts broker allocations

### Perceived Performance Baseline

- Expected entry-to-goal time: < 45s
- Expected per-step feedback: < 300ms for local responses

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
