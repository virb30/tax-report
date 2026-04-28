# Main Backend Architecture Simplification PRD

## Overview

The backend simplification effort will make portfolio, import, and tax workflows more reliable and
easier to evolve. The MVP focuses on backend error consistency and incremental ownership cleanup so
future product work can land without expanding the current mixed throw/result behavior or broad
global-layer coupling.

Manual portfolio correction behavior remains important, but it moves to Phase 2. The MVP should
prepare the backend for that workflow without adding correction storage, projection rules, or
renderer correction UI.

## Goals

- Make backend failures consistent enough for the renderer to show understandable error feedback.
- Reduce maintainer friction in high-change backend areas without a broad rewrite.
- Preserve existing portfolio, import, and tax workflows while improving backend confidence.
- Establish a clear technical path for future portfolio corrections without implementing them in
  MVP.

## User Stories

- As an investor, I want backend failures to be clear so that I can fix input problems or
  understand why an operation failed.
- As a maintainer, I want backend ownership around portfolio, import, and tax flows to be clearer
  so that changes do not require tracing behavior across many unrelated folders.
- As a maintainer, I want consistent portfolio IPC failure semantics so future correction work can
  build on a predictable backend boundary.

## Core Features

1. **Consistent Backend Error Feedback**
   User-facing backend operations return predictable failure information for validation, missing
   data, conflicts, business-rule failures, and unexpected errors.

2. **Portfolio IPC Result Standardization**
   Portfolio-facing renderer operations use a consistent result envelope instead of mixed
   throw/result behavior.

3. **Incremental Backend Simplification**
   Backend changes supporting portfolio, import preview, and annual reporting should move toward
   clearer business ownership without requiring a full `src/main` folder migration in MVP.

4. **Correction-Ready Architecture Path**
   The MVP documents where future position adjustment behavior will live and prevents new backend
   work from making that Phase 2 implementation harder.

## User Experience

Failure messages should identify the issue without exposing internal stack traces or implementation
details. The MVP should not add new correction UI or correction copy. Existing portfolio,
import-consolidated-position, recalculation, delete, migration, and reporting workflows should keep
their current behavior while presenting more predictable backend failure feedback where touched.

Maintainers should experience the MVP as a narrower backend change with clearer ownership:
portfolio failure semantics and affected backend boundaries should be discoverable without chasing
unrelated global layers.

## High-Level Technical Constraints

- Must preserve the Electron desktop app's secure renderer-to-main boundary.
- Must support existing portfolio, import, and annual report workflows during migration.
- Must keep business rules independent from Electron, IPC, SQLite, spreadsheet parsing, and other
  technical adapters.
- Must not require a broad backend rewrite before backend error consistency value is delivered.

## Non-Goals (Out of Scope)

- Manual portfolio correction storage, projection, audit trail, and renderer UI are out of scope
  for MVP.
- Date-forward correction behavior is out of scope for MVP.
- Full conversion of all backend folders into the target module structure is out of scope.
- Monthly tax assessment and DARF workflows are out of scope.
- Replacing Awilix or changing the desktop packaging model is out of scope.

## Phased Rollout Plan

### MVP (Phase 1)

- Standardize portfolio backend failure semantics with a consistent result envelope.
- Preserve existing portfolio, import-consolidated-position, recalculation, delete, migration, and
  annual report behavior.
- Apply incremental backend simplification only where needed for portfolio IPC and error
  consistency.
- Document the future correction ownership path without implementing correction storage or UI.
- Success criteria: portfolio operations expose predictable failure behavior, and maintainers can
  trace portfolio IPC behavior end to end.

### Phase 2

- Implement manual year-end portfolio corrections as explicit position adjustments.
- Treat year-end corrections as the source of truth for annual report positions.
- Expose the correction audit trail on the screen that shows final position per year.
- Recalculate transactions/imported state first, then apply position adjustments as the final
  year-end override layer.
- Extend consistent error feedback to all import and report operations.
- Continue moving high-change areas toward business-owned modules.
- Success criteria: users can understand corrected year-end state, and import/report workflows
  expose consistent failure behavior.

### Phase 3

- Complete broader portfolio, imports, and tax module alignment as those areas change.
- Remove obsolete global-layer code once replaced.
- Success criteria: maintainers can navigate backend capabilities by business domain first.

## Success Metrics

- Portfolio user failures produce actionable messages instead of mixed throw/result behavior.
- Existing portfolio and annual report behavior remains stable while portfolio IPC contracts move
  to consistent result semantics.
- Phase 2 correction behavior has a documented backend ownership path.
- Phase 2 import and report operations expose consistent failure behavior.
- Maintainers can identify the owner of portfolio, import, and reporting behavior with fewer
  cross-folder jumps.
- Existing annual report and portfolio workflows remain behaviorally stable during migration.

## Risks and Mitigations

- **Risk:** Deferring corrections delays direct tax-preparation correction value.
  **Mitigation:** MVP reduces backend failure and ownership risk first, then Phase 2 implements
  corrections on a cleaner boundary.
- **Risk:** Architecture cleanup expands beyond product value.
  **Mitigation:** Scope backend movement to portfolio IPC and error consistency paths touched by the
  MVP.
- **Risk:** Inconsistent legacy errors remain in untouched flows.
  **Mitigation:** Phase 2 explicitly extends error consistency to all import and report operations.

## Architecture Decision Records

- [ADR-001: Prioritize Portfolio Correction Auditability](adrs/adr-001.md) — Superseded by
  ADR-004 after correction behavior moved out of MVP.
- [ADR-003: Migrate Portfolio IPC to IpcResult](adrs/adr-003.md) — Portfolio IPC APIs return typed
  result envelopes for consistent failure handling.
- [ADR-004: Defer Portfolio Corrections To Phase 2](adrs/adr-004.md) — MVP focuses on backend
  error consistency and keeps correction behavior out of scope.

## Open Questions

None for MVP scope.
