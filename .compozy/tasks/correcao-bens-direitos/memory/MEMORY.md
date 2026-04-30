# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- Task 01 established the canonical asset-catalog foundation on `ticker_data` with nullable issuer metadata and persisted type provenance; later tasks can extend catalog APIs and UI without adding a second persistence table.

## Shared Decisions

- `Asset` now exposes nullable issuer metadata directly; any `'N/A'` fallback belongs in report or presentation code rather than the asset domain entity.
- Asset catalog API filtering semantics are now fixed for later tasks: `pendingOnly` includes rows missing canonical asset type or report-blocking issuer metadata, while `reportBlockingOnly` narrows to missing issuer name/CNPJ only.
- Import preview review semantics are now shared across transaction and consolidated-position flows through `ImportPreviewReviewResolver`: supported unresolved rows use `resolutionStatus: 'unresolved'` with `needsReview: true`, while unsupported rows also use `resolutionStatus: 'unresolved'` but carry `unsupportedReason` and keep `needsReview: false`.
- Import confirmation now shares the same review boundary across transaction and consolidated flows: `assetTypeOverrides` is an explicit confirm payload, manual overrides win only for supported rows, unresolved supported rows are rejected, accepted file/manual resolutions are persisted to `ticker_data` before saving, and unsupported rows remain skipped/ephemeral with `skippedUnsupportedRows` reported back to the renderer.
- Initial-balance documents are now an edit/view projection over grouped `initial_balance` transactions keyed by `ticker + year`; later UI/report tasks must treat `transactions` as the source of truth and must not introduce a second document persistence table.
- Declaration-oriented report assembly is now transaction-driven at request time: `GenerateAssetsReportUseCase` depends on `TransactionRepository` to reconstruct prior/current year values, so later report/UI tasks must not assume persisted report snapshots or position-only year-end valuation inputs are sufficient.

## Shared Learnings

- Task prompts in this workflow reference `CLAUDE.md`, but the file does not exist anywhere in this workspace. Use `AGENTS.md` plus the PRD and ADR documents as the authoritative guidance set instead.
- Fresh in-memory databases already contain broker codes such as `XP` from the baseline migrations, so later tests or fixtures must avoid reusing those seeded codes.
- Both CSV/XLSX import parsers now normalize the optional `Tipo Ativo` column in-place; later import-review UI and confirm tasks should consume `sourceAssetType`/`sourceAssetTypeLabel` from the existing parser outputs instead of introducing a second file format.
- Because `initial_balance` transactions do not store `assetType`, later consumers that need document `assetType` must source it from persisted positions or another authoritative catalog layer rather than expecting it on grouped transaction rows.

## Open Risks

## Handoffs
- Task 10 implemented a status-first declaration report and minimal asset catalog; repair actions are now shared via EditAssetModal to ensure consistency between catalog maintenance and report-time corrections.
- Learned that PowerShell Set-Content is a durable fallback for file writes when the CLI's write_file tool fails with internal errors.
