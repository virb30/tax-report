## TC-CFR-002: Error-Recoverability on monthly tax repair flow

**Priority:** P0
**Type:** CFR
**Status:** Not Run
**Estimated Time:** 15 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**CFR Category:** Error-Recoverability
**Persona:** Recovering User
**Surface:** Imposto Mensal
**Automation Target:** Manual-only
**Automation Status:** N/A
**Automation Command/Spec:** none
**Automation Notes:** Requires failure-path observation and recovery judgment.

### Objective

Verify that blocked or failing monthly-tax states give the user a clear explanation, a workable next step, and a safe return path.

### Preconditions

- [ ] A blocked or error-producing monthly history response exists
- [ ] Repair CTA targets a real tab or feature

### Real-User Conditions

| Dimension | Value |
|-----------|-------|
| Network | flaky |
| Device | laptop |
| Browser | Chrome |
| Locale | pt-BR |
| Timezone | America/Sao_Paulo |
| Autofill | empty |
| Modality | mouse-keyboard |

### Checklist

- [ ] Blocked state explains what is wrong in user language
- [ ] CTA names the repair destination clearly
- [ ] Returning to monthly tax does not lose orientation
- [ ] Retry or refresh affordance exists after recoverable fetch failures

### Targets

| Observable | Target | Acceptable | Actual |
|---|---|---|---|
| Error message comprehension | clear on first read | acceptable after reread | |
| Time to locate next action | < 5s | < 10s | |
| Return-path clarity | obvious | acceptable | |

### Pass criteria

- All checklist items mark pass.
- No `Trust-Damage`-class or higher CFR finding surfaces.

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
