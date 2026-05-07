# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- Task 02 is implemented and verified. Monthly recalculation prerequisites now include a daily broker tax period-read seam and an asset classification change event from asset repair.
- Task 03 is implemented and verified. Monthly tax input normalization now has pure tax-reporting domain services for asset class resolution and daily IRRF allocation.

## Shared Decisions

## Shared Learnings

## Open Risks

## Handoffs
- Future monthly recalculation handlers can subscribe to `AssetTaxClassificationChangedEvent` and start from `earliestYear`.
- Future monthly calculator work can compose `MonthlyTaxAssetClassResolverService` and `MonthlyTaxIrrfAllocatorService` without repository or IPC dependencies.
