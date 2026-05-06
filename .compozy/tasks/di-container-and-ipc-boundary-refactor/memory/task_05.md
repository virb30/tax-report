# Task Memory: task_05.md

## Objective Snapshot
- Completed wiring and boundary cleanup.
- Removed all global container exports and service-locator patterns from the bootstrap.
- Enforced import boundaries for renderer and application layers using ESLint `no-restricted-imports`.
- Verified all tests and linting.

## Important Decisions
- Verified that all `container.resolve` calls were removed in the main container bootstrap, fulfilling the TechSpec requirements.

## Learnings
- The linting rules are effectively catching boundary violations.
- Regression tests provided confidence in the structural cleanup.

## Files / Surfaces
- `src/main/app/infra/container/index.ts`
- `eslint.config.mjs`

## Errors / Corrections
- None.

## Ready for Next Run
- Task completed.
