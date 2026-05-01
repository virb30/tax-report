---
status: completed
title: Add Import Resolution Preview Backend
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 4: Add Import Resolution Preview Backend

## Overview

This task enriches transaction and consolidated-position previews with asset-type resolution,
review state, and unsupported-line classification. It prepares the import surfaces for guided
review without yet changing confirmation persistence semantics.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST implement preview-time asset type resolution using the TechSpec precedence rules for file data, catalog data, and unresolved supported rows.
- MUST classify unsupported asset classes or unsupported events separately from unresolved supported rows.
- MUST extend both transaction and consolidated-position preview payloads with resolved type, resolution status, review flags, and unsupported summaries.
- MUST normalize the optional `Tipo Ativo` source column where present instead of inventing a second import file format.
- MUST avoid persisting catalog overrides or accepted rows in this task.
</requirements>

## Subtasks
- [x] 4.1 Add shared resolution status and unsupported summary types to the import preview contracts.
- [x] 4.2 Implement an asset-type resolver service for preview-time precedence handling.
- [x] 4.3 Extend the transaction parser and preview use case to expose resolution and unsupported state.
- [x] 4.4 Extend consolidated-position preview to expose the same review semantics.
- [x] 4.5 Add focused unit and IPC-level tests for preview resolution and unsupported classification.

## Implementation Details

Implement the TechSpec sections "Import Review Pipeline" and "Implementation Design > Import
preview DTOs". Keep parsing, resolution, and unsupported classification as distinct concerns so
later confirm logic can reuse the preview semantics without duplicating them. Do not add any
session persistence for skipped or unsupported lines.

### Relevant Files

- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.ts` — Already normalizes optional `Tipo Ativo` headers and must now expose that data to preview.
- `src/main/infrastructure/parsers/csv-xlsx-consolidated-position.parser.ts` — Consolidated preview needs the same review metadata as transactions.
- `src/main/application/use-cases/preview-import/preview-import-use-case.ts` — Transaction preview orchestration point.
- `src/main/application/use-cases/import-consolidated-position/import-consolidated-position-use-case.ts` — Consolidated preview logic currently lives here.
- `src/shared/contracts/preview-import.contract.ts` — Shared preview DTOs for transaction import.
- `src/shared/contracts/import-consolidated-position.contract.ts` — Shared preview DTOs for consolidated import.
- `src/shared/types/domain.ts` — Existing domain enums are the natural place for any new shared status constants.

### Dependent Files

- `src/main/ipc/handlers/import/import-ipc-handlers.ts` — Preview handlers must return the enriched DTOs unchanged.
- `src/main/ipc/handlers/portfolio/portfolio-ipc-handlers.ts` — Consolidated preview handler must return the enriched DTOs unchanged.
- `src/renderer/pages/import-page/use-transaction-import.ts` — Renderer preview state will consume the new fields in task 05.

### Related ADRs

- [ADR-003: Extend `ticker_data` into the Canonical Asset Catalog](adrs/adr-003.md) — Resolution may fall back to catalog state.
- [ADR-004: Use Preview-Confirm Contracts as the Import Review Boundary](adrs/adr-004.md) — Defines preview as the place where review data is exposed.
- [ADR-007: Keep Unsupported Import Issues Ephemeral in the MVP](adrs/adr-007.md) — Limits unsupported-line handling to the import session.

## Deliverables

- Shared preview contracts extended with resolution and unsupported metadata.
- Preview-time asset-type resolver and unsupported classifier behavior in the main process.
- Transaction and consolidated preview use cases returning the enriched review state.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for preview contract behavior **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] A transaction row with a valid `Tipo Ativo` resolves from file and is marked review-free.
  - [x] A row without file type but with catalog type resolves from the catalog and reports that source.
  - [x] A supported row with neither file nor catalog type is marked `unresolved` and `needsReview`.
  - [x] An unsupported event row is classified as unsupported without being treated as a reviewable supported row.
  - [x] Consolidated-position preview returns the same resolution fields and status vocabulary as transaction preview.
- Integration tests:
  - [x] Transaction preview IPC returns summary counts for supported, pending, and unsupported rows.
  - [x] Consolidated preview IPC returns enriched rows without persisting any catalog or transaction changes.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Import previews expose resolution state and unsupported summaries for both import surfaces.
- No confirmation persistence or catalog mutation occurs during preview.
