## SMOKE-001: Import and monthly-tax entry sanity

**Priority:** P0
**Type:** Smoke
**Status:** Not Run
**Estimated Time:** 2 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**Persona:** New User
**Journey:** J-01 Import transactions and confirm preview
**Automation Target:** E2E
**Automation Status:** Existing
**Automation Command/Spec:** `cd frontend && npm run test -- --runTestsByPath src/App.e2e.test.tsx --coverage=false`
**Automation Notes:** Existing workflow spec proves the shell, import entry, and monthly tax tab switch at the public UI level.

### Objective

Confirm the build is not catastrophically broken by proving the main workspace renders, the import screen is reachable, and the monthly tax workspace loads.

### Preconditions

- [ ] Frontend dependencies installed
- [ ] Backend and frontend commands available
- [ ] Synthetic fixtures only

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

1. Open the application shell.
   - **Expected:** The `Tax Report` heading and import section render promptly.
2. Reach the import entry and confirm the file selector is available.
   - **Expected:** The `Arquivo selecionado` input is visible and enabled.
3. Switch to the monthly tax workspace.
   - **Expected:** The `Imposto mensal` section loads without a crash.

### Edge Cases & Variations

| Variation | Action | Expected Result |
|-----------|--------|-----------------|
| Empty state | Open app with no imported data | Empty-state messaging stays clear and non-blocking |
| Retry open | Reload and repeat | Same shell state returns without broken navigation |

### Post-conditions

- No persisted data required
- No cleanup required

### Related Test Cases

- TC-JOURNEY-001: Import transactions and confirm preview
- TC-JOURNEY-003: Monthly tax repair navigation

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
