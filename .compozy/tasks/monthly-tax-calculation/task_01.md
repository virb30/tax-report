---
status: completed
title: Persist monthly tax close artifacts
type: infra
complexity: medium
dependencies: []
---

# Task 01: Persist monthly tax close artifacts

## Overview
Create the derived persistence layer that monthly tax close depends on. This task establishes the `monthly_tax_closes`
table plus the repository seam used by later calculation and query use cases, keeping the first deliverable aligned
with ADR-004 and the TechSpec "Data Models" section.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST add a new database migration for `monthly_tax_closes` and register it in the shared migration index.
2. MUST persist one current artifact per month keyed by `YYYY-MM`, including summary columns and a JSON detail payload.
3. MUST expose a repository contract plus a Knex implementation inside `src/main/tax-reporting` without leaking database details into application or domain layers.
4. MUST cover repository save, overwrite, history-read, and detail-read behavior with automated tests.
</requirements>

## Subtasks
- [x] 1.1 Define the month artifact persistence contract used by monthly tax use cases.
- [x] 1.2 Add the `monthly_tax_closes` migration and register it in the database migration list.
- [x] 1.3 Implement the Knex repository for summary and detail reads plus upsert-style writes.
- [x] 1.4 Add repository-focused tests for row mapping, overwrite semantics, and query ordering.

## Implementation Details
Create the minimal persistence slice described in the TechSpec "Data Models" and ADR-004 "Decision" sections. Keep
the repository owned by `tax-reporting`, with summary columns optimized for history queries and a JSON payload for
month detail.

### Relevant Files
- `src/main/app/infra/database/migrations/index.ts` — registers new migration files in boot order.
- `src/main/app/infra/database/migrations/015-create-transaction-fees.ts` — current migration style reference for table creation and rollback.
- `src/main/tax-reporting/infra/container/index.ts` — existing `tax-reporting` composition root that will later receive the repository.
- `src/main/tax-reporting/infra/container/index.spec.ts` — current module-level spec pattern for `tax-reporting`.

### Dependent Files
- `src/main/tax-reporting/application/use-cases/list-monthly-tax-history.use-case.ts` — future history reads depend on repository summary queries.
- `src/main/tax-reporting/application/use-cases/get-monthly-tax-detail.use-case.ts` — future detail reads depend on repository detail payload access.
- `src/main/tax-reporting/application/use-cases/recalculate-monthly-tax-history.use-case.ts` — future recalculation writes depend on repository save and delete semantics.

### Related ADRs
- [ADR-004: Persist Monthly Close Artifacts and Recalculate Forward Automatically](adrs/adr-004.md) — defines the artifact table and overwrite strategy.
- [ADR-005: Keep Monthly Close in Tax Reporting with Coarse-Grained IPC](adrs/adr-005.md) — keeps the repository inside `tax-reporting`.

## Deliverables
- `monthly_tax_closes` migration registered in the database startup path.
- Monthly close repository contract and Knex implementation under `src/main/tax-reporting`.
- Automated repository tests for summary reads, detail reads, and overwrite behavior.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for monthly close persistence **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Saving a monthly artifact for a new month stores summary columns and the JSON detail payload.
  - [x] Saving a second artifact for the same month replaces the current persisted values instead of creating duplicates.
  - [x] Reading month detail for a known `YYYY-MM` returns the stored audit payload unchanged.
- Integration tests:
  - [x] Database migration creates `monthly_tax_closes` with the columns required by history and detail queries.
  - [x] History query returns persisted months in deterministic chronological order for renderer consumption.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `monthly_tax_closes` exists in the migration chain and can be created from a fresh database.
- `tax-reporting` has a repository seam ready for monthly calculation and query use cases.
