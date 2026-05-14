## TC-JOURNEY-001: Import transactions and confirm preview

**Priority:** P0
**Type:** Journey
**Status:** Not Run
**Estimated Time:** 10 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**Persona:** Power User
**Journey:** J-01 Import transactions and confirm preview
**Automation Target:** E2E
**Automation Status:** Existing
**Automation Command/Spec:** `frontend/src/App.e2e.test.tsx`
**Automation Notes:** Existing workflow spec covers file upload, preview, and confirm using the app shell.

### Journey Value

The user turns a broker-export file into reviewed portfolio activity without manually entering each transaction.

### Preconditions

- [ ] Synthetic CSV/XLSX file available
- [ ] At least one broker exists or broker lookup mock/fixture is present
- [ ] App shell reachable

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

1. Open `Importacao e Conferencia`.
   - Input: `ops.csv`
   - **Expected:** The selected filename appears and the preview action becomes available.
2. Request the preview.
   - **Expected:** The UI reports a preview summary and renders the transaction preview table.
3. Confirm the import.
   - **Expected:** The UI shows a success message with imported count and recalculated tickers.

### Edge Cases & Variations

| Variation | Action | Expected Result |
|-----------|--------|-----------------|
| Cancel selection | Open file chooser and cancel | No stale filename or false-positive preview state |
| Invalid preview payload | Submit a file that triggers backend validation | Clear error message; no confirm action |
| Back after success | Leave and return to the tab | No duplicate import is triggered silently |

### Post-conditions

- Imported synthetic data may exist in local DB
- Clear or isolate DB before unrelated reruns if needed

### Related Test Cases

- SMOKE-001: Import and monthly-tax entry sanity
- TC-JOURNEY-002: Register or edit starting balance and verify positions

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
