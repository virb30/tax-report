## TC-CFR-001: Usability on annual report flow

**Priority:** P1
**Type:** CFR
**Status:** Not Run
**Estimated Time:** 15 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**CFR Category:** Usability
**Persona:** Casual User
**Surface:** Relatorio Bens e Direitos
**Automation Target:** Manual-only
**Automation Status:** N/A
**Automation Command/Spec:** none
**Automation Notes:** Requires user-judgment on clarity, grouping, and copy feedback.

### Objective

Verify that a casual user can understand report readiness, pending issues, and copy actions without specialized tax or system knowledge.

### Preconditions

- [ ] Report screen reachable
- [ ] Synthetic data available with at least one ready or pending item

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

### Checklist

- [ ] The screen communicates what the report is for in plain language
- [ ] Ready vs pending group labels are understandable without reading code terms
- [ ] Copy actions give immediate, specific feedback
- [ ] Empty-state or error-state text explains the next step

### Targets

| Observable | Target | Acceptable | Actual |
|---|---|---|---|
| Time to understand primary action | < 5s | < 10s | |
| Button feedback after click | < 100ms | < 300ms | |
| Success/fallback copy message clarity | explicit | acceptable | |

### Pass criteria

- All checklist items mark pass.
- No `Friction`-class or higher CFR finding surfaces.

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
