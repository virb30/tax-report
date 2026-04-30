# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement preview-only asset type resolution and unsupported classification for transaction and consolidated-position imports.
- Keep confirm/import persistence semantics unchanged in this task; task 06 remains responsible for override persistence and supported-row filtering at confirm time.

## Important Decisions
- Treat `AGENTS.md`, the PRD, `_techspec.md`, and ADRs as authoritative because `CLAUDE.md` is absent from the workspace.
- Build on the branch's existing asset-catalog and import-review scaffolding instead of reverting or reworking unrelated in-progress changes.
- Keep unsupported preview rows in the main preview arrays with explicit `unsupportedReason` plus aggregate `summary` counts, instead of adding a second preview-only payload for this task.
- Centralize preview resolution precedence in `ImportPreviewReviewResolver` so transaction and consolidated previews share the same file-vs-catalog-vs-unresolved behavior.

## Learnings
- The transaction parser contract has already been expanded on this branch to return `ParsedTransactionFile` with `unsupportedRows`, but the preview and confirm use cases and several tests still assume the old `ParsedTransactionBatch[]` shape.
- The consolidated-position parser port already exposes optional source asset type fields, but the concrete CSV/XLSX parser does not populate them yet.
- Full-project verification after the preview changes required updating legacy confirm-path tests and the consolidated application-contract integration test to the new parser/result shapes and constructor order.

## Files / Surfaces
- `src/shared/contracts/preview-import.contract.ts`
- `src/shared/contracts/import-consolidated-position.contract.ts`
- `src/shared/contracts/import-preview-review.contract.ts`
- `src/main/application/use-cases/preview-import/preview-import-use-case.ts`
- `src/main/application/use-cases/import-consolidated-position/import-consolidated-position-use-case.ts`
- `src/main/application/use-cases/import-transactions/import-transactions-use-case.ts`
- `src/main/domain/ingestion/import-preview-review-resolver.service.ts`
- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.ts`
- `src/main/infrastructure/parsers/csv-xlsx-consolidated-position.parser.ts`
- `src/main/infrastructure/container/index.ts`
- `src/main/ipc/handlers/ipc-handlers.integration.test.ts`
- `src/main/application/use-cases/preview-import/preview-import-use-case.test.ts`
- `src/main/application/use-cases/import-consolidated-position/import-consolidated-position-use-case.test.ts`

## Errors / Corrections
- Repository instruction references `CLAUDE.md`, but the file is missing. Shared workflow memory already documents this mismatch.
- Initial focused test run passed functionally but failed global coverage because it intentionally ran only a subset; full `npm test` was required for the completion gate.

## Ready for Next Run
- Verification complete: `npm run lint` and `npm test` both pass after the preview-resolution changes.
