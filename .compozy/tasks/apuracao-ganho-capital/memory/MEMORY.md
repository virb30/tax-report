# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- Task 06 exposed the capital gains assessment through typed IPC (`tax-reporting:capital-gains-assessment`) and registered all backend components in the Awilix container.
- Renderer can now call `window.electronApi.generateCapitalGainsAssessment({ baseYear })`.

## Shared Decisions
- Cross-boundary capital gains statuses, supported categories, blocker codes, and trace
  classifications live in `src/shared/types/domain.ts`.
- `CapitalGainsAssessmentService` is a domain-level sale assessment service that returns
  `saleTraces` and `blockers`; monthly tax classification and loss compensation remain
  separate for task 04.
- Container uses explicit `.inject()` for the capital gains use case to bridge constructor parameter names to registered keys.

## Shared Learnings
- `npm run test:prepare` may be needed before Jest when `better-sqlite3` was built under
  a different Node version.
- Avoid using PowerShell `echo` to create TypeScript source files as it may use UTF-16
  encoding with BOM, causing "File appears to be binary" (TS1490) errors in Jest. Use
  `write_file` or equivalent.

## Open Risks
- Repo-wide `npm run format` currently reports many pre-existing unformatted files outside
  the capital gains task scope.

## Handoffs
- Task 02 added a tax-reporting read model under
  `src/main/tax-reporting/application/queries` and `src/main/tax-reporting/infra/queries`.
  Later wiring tasks still need to register the Knex adapter in the container.
