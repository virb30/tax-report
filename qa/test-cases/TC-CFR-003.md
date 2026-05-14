## TC-CFR-003: Production-Parity on frontend/backend integration

**Priority:** P0
**Type:** CFR
**Status:** Not Run
**Estimated Time:** 10 minutes
**Created:** 2026-05-13
**Last Updated:** 2026-05-13
**CFR Category:** Production-Parity
**Persona:** New User
**Surface:** Full application shell
**Automation Target:** Manual-only
**Automation Status:** N/A
**Automation Command/Spec:** none
**Automation Notes:** This check validates realistic runtime wiring rather than isolated component logic.

### Objective

Verify that the local runtime is production-like enough that workflow QA claims are trustworthy.

### Preconditions

- [ ] Frontend and backend can both start locally
- [ ] Frontend can reach `/api` through the intended runtime path or documented serving layer

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

- [ ] Runtime is not purely mocked
- [ ] Backend `/api/health` is reachable
- [ ] Frontend URL is reachable
- [ ] The frontend runtime wiring to `/api` is documented and works

### Targets

| Observable | Target | Acceptable | Actual |
|---|---|---|---|
| Backend readiness | reachable | reachable after retry | |
| Frontend readiness | reachable | reachable after retry | |
| API wiring from frontend | functional | documented blocker only | |

### Pass criteria

- All readiness checks pass, or an exact blocker is documented and the overall QA verdict is downgraded accordingly.

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
|------|--------|-------|--------|--------|-------|
| | | | | | |
