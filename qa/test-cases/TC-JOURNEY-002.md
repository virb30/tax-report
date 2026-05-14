## TC-JOURNEY-002: Register or edit starting balance and verify positions

**Priority:** P0
**Type:** Journey
**Status:** Not Run
**Estimated Time:** 12 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**Persona:** Power User
**Journey:** J-02 Register or edit starting balance and verify positions
**Automation Target:** E2E
**Automation Status:** Existing
**Automation Command/Spec:** `frontend/src/App.e2e.test.tsx`
**Automation Notes:** Existing workflow spec covers create, edit, and resulting allocation/position refresh behavior.

### Journey Value

The user establishes or fixes the baseline portfolio state needed for later tax reporting.

### Preconditions

- [ ] Brokers exist for allocation
- [ ] Starting-balance form reachable
- [ ] Synthetic asset data only

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

1. Open `Saldo Inicial` and fill ticker, price, and first allocation.
   - Input: `IVVB11`, `300`, broker `XP`, quantity `2`
   - **Expected:** The form accepts valid values and allows saving.
2. Add a second allocation and save the starting balance.
   - Input: broker `Rico`, quantity `1`
   - **Expected:** A success message appears and both broker allocations show in the saved document table.
3. Edit the saved balance to remove one allocation and adjust quantity/price.
   - Input: remove `Rico`, change quantity to `5`, average price to `320`
   - **Expected:** The update succeeds and the table reflects only the remaining broker allocation.

### Edge Cases & Variations

| Variation | Action | Expected Result |
|-----------|--------|-----------------|
| Missing broker | Save with an empty allocation broker | Clear validation failure; no persisted document |
| Missing quantity | Save with blank quantity | Clear validation failure; no mixed document/position state |
| Edit after save | Reopen saved document | Existing values load without duplication |

### Post-conditions

- Synthetic starting-balance data may remain in local DB
- Cleanup can be done by deleting documents or resetting the DB

### Related Test Cases

- TC-JOURNEY-001: Import transactions and confirm preview
- TC-JOURNEY-004: Generate the annual assets report and copy declaration text

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
