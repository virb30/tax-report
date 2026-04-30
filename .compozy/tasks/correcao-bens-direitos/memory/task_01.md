# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Extend `ticker_data` into the canonical asset catalog for task 01 by adding nullable issuer metadata plus canonical `asset_type` and `resolution_source`, then align the asset domain and Knex repository with regression coverage.

## Important Decisions

- Keep `ticker_data` as the only persistence store for asset catalog changes; continue using repository `save` as the upsert/update entrypoint.
- Change the `Asset` entity to expose nullable issuer metadata directly and keep `'N/A'` fallback only in report-generation/presentation code.
- Add `findByTicker` to the asset repository now so later catalog maintenance tasks can work from the existing DI and repository boundary instead of reaching into Knex directly.

## Learnings

- `CLAUDE.md` was requested by the task instructions but does not exist anywhere in the workspace, so execution is grounded in `AGENTS.md`, the task docs, and the ADRs instead.
- Full-suite verification exposed a pre-existing broker fixture collision with migration-seeded broker code `XP`; `knex-position.repository.test.ts` now uses `XPTEST` to keep the initialized schema and tests aligned.

## Files / Surfaces

- Expected implementation surfaces: `src/main/database/migrations/*`, `src/main/domain/portfolio/entities/asset.entity.ts`, `src/main/application/repositories/asset.repository.ts`, `src/main/infrastructure/repositories/knex-asset.repository*.ts`, and database/repository tests.
- Implemented surfaces: migration `013-extend-ticker-data-asset-catalog`, migration index, `src/shared/types/domain.ts`, asset entity and spec, asset repository contract, Knex asset repository and spec, database integration tests, report generator fallback, generate-assets-report mock setup, and the broker-fixture correction in `knex-position.repository.test.ts`.

## Errors / Corrections

- `rg` is not installed in this shell environment; use PowerShell file discovery and `Select-String` instead.
- `npm run format` is not a reliable repo-wide gate in this workspace because it reports hundreds of unrelated pre-existing files outside task scope; task verification used Prettier checks on touched files plus repo-wide lint, tests, and packaging.

## Ready for Next Run

- Verification completed successfully with `npm run lint`, `npm test`, and `npm run package`. Task tracking still needs to be updated in `task_01.md` and `_tasks.md`.
