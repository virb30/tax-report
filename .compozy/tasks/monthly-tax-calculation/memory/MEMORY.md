# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- Task 02 is implemented and verified. Monthly recalculation prerequisites now include a daily broker tax period-read seam and an asset classification change event from asset repair.
- Task 03 is implemented and verified. Monthly tax input normalization now has pure tax-reporting domain services for asset class resolution and daily IRRF allocation.
- Task 04 is implemented and verified. Monthly close now has a typed artifact detail payload, `MonthlyTaxCalculatorService`, and `MonthlyTaxWorkspaceStateResolverService` in the tax-reporting domain layer.
- Task 07 is implemented and verified. The renderer now has an `Imposto Mensal` tab, `MonthlyTaxPage`, a page-local history hook, and top-level state rendering for monthly close summaries.

## Shared Decisions

## Shared Learnings
- Monthly tax recalculation must replay full canonical transaction history to seed positions, losses, IRRF credits, and below-threshold carry-forward correctly; the requested `startYear` controls which persisted artifacts are deleted and rewritten.

## Open Risks

## Handoffs
- Future monthly recalculation handlers can subscribe to `AssetTaxClassificationChangedEvent` and start from `earliestYear`.
- Future monthly calculator work can compose `MonthlyTaxAssetClassResolverService` and `MonthlyTaxIrrfAllocatorService` without repository or IPC dependencies.
- Future monthly history/detail/recalculation use cases can persist calculator-emitted `MonthlyTaxCloseArtifact` values and expose `MonthlyTaxCloseDetail` without deriving state or outcome in the renderer.
- Future month-detail and repair CTA work can extend the existing `MonthlyTaxPage` tab instead of adding routes; app navigation remains local tab state in `src/renderer/App.tsx`.
