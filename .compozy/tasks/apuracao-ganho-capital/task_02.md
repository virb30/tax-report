---
status: completed
title: Add Capital Gains Assessment Read Model Query
type: backend
complexity: medium
dependencies:
    - task_01
---

# Task 2: Add Capital Gains Assessment Read Model Query

## Overview

Add the tax-reporting read/query port and Knex adapter that load source facts for one
selected tax year. This task gives the assessment workflow a report-shaped data source
without pushing tax-reporting joins into portfolio aggregate repositories.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `CapitalGainsAssessmentQuery` in the tax-reporting application layer.
- MUST create a Knex implementation under `src/main/tax-reporting/infra/queries`.
- MUST load selected-year transactions with allocated transaction fees.
- MUST load asset classification for each ticker from the asset catalog data.
- SHOULD include daily broker tax facts where they are available for trace or future IRRF visibility.
- MUST return stable ordering by date and deterministic tie-breakers for same-day transactions.
- MUST not mutate portfolio, ingestion, or tax-reporting data.
</requirements>

## Subtasks

- [ ] 2.1 Create the application-layer query port and source fact result shape.
- [ ] 2.2 Create the Knex query adapter in the tax-reporting infra layer.
- [ ] 2.3 Read transactions and allocated fees for the selected tax year.
- [ ] 2.4 Join or map ticker asset metadata needed for supported category detection.
- [ ] 2.5 Include available daily broker tax facts without making DARF behavior part of V1.
- [ ] 2.6 Add integration-style tests with in-memory SQLite fixtures.

## Implementation Details

Follow the TechSpec "System Architecture" and "Core Interfaces" sections. The query is a
read model for assessment facts, so it should return DTOs and remain side-effect free.

### Relevant Files

- `src/main/portfolio/infra/repositories/knex-transaction.repository.ts` — Shows transaction table mapping and fee join behavior.
- `src/main/portfolio/infra/repositories/knex-transaction.repository.test.ts` — Existing Knex repository test style.
- `src/main/app/infra/database/database.ts` — Database initialization helper used by tests.
- `src/main/app/infra/database/database-connection.ts` — In-memory SQLite connection pattern.
- `src/main/app/infra/database/migrations/004-create-transactions.ts` — Transaction schema.
- `src/main/app/infra/database/migrations/007-create-assets.ts` — Asset catalog schema lineage.
- `src/main/app/infra/database/migrations/014-create-daily-broker-taxes.ts` — Daily broker tax schema.
- `src/main/app/infra/database/migrations/015-create-transaction-fees.ts` — Allocated transaction fees schema.

### Dependent Files

- `src/main/tax-reporting/application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.use-case.ts` — Will call the query port.
- `src/main/app/infra/container/index.ts` — Will register the Knex query adapter in task 06.
- `src/main/tax-reporting/domain/capital-gains-assessment.service.ts` — Will consume source fact ordering and fields.

### Related ADRs

- [ADR-003: Tax Reporting Read Model for Capital Gains Assessment](adrs/adr-003.md) — Selects a dedicated read/query port and Knex adapter.

## Deliverables

- `CapitalGainsAssessmentQuery` application port.
- `KnexCapitalGainsAssessmentQuery` adapter with deterministic selected-year reads.
- In-memory database tests covering joined assessment facts.
- Unit/integration tests with 80%+ coverage **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Empty selected year returns empty transaction and tax fact collections.
  - [ ] Unsupported or missing asset type is preserved as source fact data rather than filtered out.
- Integration tests:
  - [ ] Transactions before and after `baseYear` are excluded while transactions inside the year are included.
  - [ ] Transaction fees from `transaction_fees` are returned with the matching transaction.
  - [ ] Asset type metadata from the catalog is returned for stock, FII, ETF, BDR, and missing metadata cases.
  - [ ] Daily broker taxes for the selected year are returned without changing stored data.
  - [ ] Same-day transactions are returned in stable date/id order.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- The use case can load all V1 assessment source facts through one tax-reporting query port.
- Portfolio and ingestion repositories remain unchanged.
