---
status: completed
title: Extend Asset Catalog Foundation
type: backend
complexity: high
dependencies: []
---

# Task 1: Extend Asset Catalog Foundation

## Overview

This task turns `ticker_data` into the canonical asset catalog described in the TechSpec.
It establishes the schema, domain, and repository changes that every later import, repair,
report, and UI task depends on.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a new migration after `012-add-active-to-brokers` that extends `ticker_data` with nullable issuer metadata, canonical `asset_type`, and `resolution_source`.
- MUST update the domain `Asset` entity and `AssetRepository` contract to support nullable issuer fields and persisted type provenance.
- MUST update `KnexAssetRepository` to read, upsert, and list the expanded catalog fields without introducing a second persistence store.
- MUST preserve existing database bootstrap and container wiring so later tasks can reuse the catalog through current dependency injection patterns.
- MUST add repository and migration regression tests for old rows, nullable fields, and updated upsert behavior.
</requirements>

## Subtasks

- [x] 1.1 Add migration `013-*` and register it in the database migration index.
- [x] 1.2 Expand the asset domain model to represent canonical asset type and resolution source.
- [x] 1.3 Extend the asset repository port with the lookup and update capabilities required by later tasks.
- [x] 1.4 Update the Knex asset repository mapping and upsert behavior for nullable issuer data.
- [x] 1.5 Add focused repository and initialization tests for the expanded catalog schema.

## Implementation Details

Implement the TechSpec sections "System Architecture > Asset Catalog" and
"Implementation Design > Data Models" first, before any import or report changes. Keep the catalog
limited to ticker identity, supported asset type, issuer metadata, and minimal resolution
provenance. Do not add report snapshots, unsupported issue storage, or a second asset table.

### Relevant Files

- `src/main/database/migrations/009-create-ticker-data.ts` — Current base definition of `ticker_data`.
- `src/main/database/migrations/index.ts` — Registers migrations in initialization order.
- `src/main/domain/portfolio/entities/asset.entity.ts` — Current asset domain model that assumes stronger issuer presence.
- `src/main/application/repositories/asset.repository.ts` — Asset repository port that later tasks will extend.
- `src/main/infrastructure/repositories/knex-asset.repository.ts` — Current persistence mapping for `ticker_data`.
- `src/main/infrastructure/repositories/knex-asset.repository.test.ts` — Existing repository regression coverage to expand.

### Dependent Files

- `src/main/application/use-cases/generate-asset-report/generate-assets-report.use-case.ts` — Current report use case already consumes the asset repository.
- `src/main/infrastructure/container/index.ts` — Dependency wiring must remain compatible with the updated repository.
- `src/main/application/use-cases/application-contracts.integration.test.ts` — Integration coverage may need schema assumptions updated.

### Related ADRs

- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Defines the storage and ownership model for asset metadata.

## Deliverables

- Migration `013-*` extending `ticker_data` with canonical asset catalog fields.
- Updated asset domain and repository contracts for nullable issuer metadata and type provenance.
- Knex repository support for reading and upserting the expanded asset catalog.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for repository persistence and database initialization **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Mapping a row with null `cnpj` and null `name` yields a valid asset catalog entry.
  - [x] Upserting the same ticker updates `asset_type`, `resolution_source`, `name`, and `cnpj` without duplicating rows.
  - [x] Listing catalog rows preserves stable ticker ordering after the schema change.
  - [x] Domain asset objects expose nullable issuer metadata without reverting to forced placeholder values.
- Integration tests:
  - [x] Database initialization applies the new migration cleanly in an in-memory database.
  - [x] Existing rows created under the old `ticker_data` layout remain readable after migration.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `ticker_data` can persist canonical asset type and nullable issuer metadata.
- Later tasks can read and update asset catalog rows without introducing a new table.
