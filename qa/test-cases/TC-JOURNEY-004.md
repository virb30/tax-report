## TC-JOURNEY-004: Generate the annual assets report and copy declaration text

**Priority:** P1
**Type:** Journey
**Status:** Not Run
**Estimated Time:** 8 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**Persona:** Casual User
**Journey:** J-04 Generate the annual assets report and copy declaration text
**Automation Target:** E2E
**Automation Status:** Existing
**Automation Command/Spec:** `frontend/src/App.e2e.test.tsx`
**Automation Notes:** Existing workflow spec covers report generation and copy feedback.

### Journey Value

The user reaches declaration-ready text for year-end assets reporting and understands pending items that still need cleanup.

### Preconditions

- [ ] Starting balances or positions exist for the selected base year
- [ ] Clipboard permissions are available or fallback copy handling is visible

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

1. Open `Relatorio Bens e Direitos` and generate the report for the default base year.
   - **Expected:** Reference date and report groups render without a crash.
2. Review ready and pending items.
   - **Expected:** The screen separates declaration-ready and pending records clearly.
3. Copy a declaration description.
   - **Expected:** The UI confirms copy success or shows a clear manual-copy fallback.

### Edge Cases & Variations

| Variation | Action | Expected Result |
|-----------|--------|-----------------|
| No positions | Generate for a year with no holdings | Clear empty-state message, no false readiness |
| Pending asset metadata | Open a report with pending items | Repair affordance remains understandable |
| Clipboard denied | Simulate copy failure | Manual-copy fallback message appears |

### Post-conditions

- No destructive cleanup required
- If live copy is exercised, copied text should remain synthetic

### Related Test Cases

- TC-JOURNEY-002: Register or edit starting balance and verify positions
- TC-CFR-001: Usability on annual report flow

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
