# Repository Guidelines

## Main Technologies

- Main language: TypeScript.
- Main framework: Electron.
- Frontend: React.
- Database: sqlite (better-sqlite3 + knex)
- Tests: jest
- Lint: eslint
- Format: prettier

Load the relevant rules before executing any task.

## Rules Map

| Rule           | Path                               | Use when                                                                                                     |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Architecture   | `@.agents/rules/architecture.md`   | Changing module boundaries, use cases, repositories, adapters, entities, DTOs, or backend/shared structure.  |
| Code Standards | `@.agents/rules/code-standards.md` | Any code edit. This is the default baseline.                                                                 |
| Tests          | `@.agents/rules/tests.md`          | Adding, changing, fixing, or reviewing tests, or validating behavior changes.                                |
| React          | `@.agents/rules/react.md`          | Working in `src/renderer/**` with pages, hooks, components, styles, or renderer tests.                       |
| Node           | `@.agents/rules/node.md`           | Working in `src/main/**` with services, controllers, repositories, parsers, database code, or backend tests. |
| Electron       | `@.agents/rules/electron.md`       | Changing IPC, `preload.ts`, `src/shared/**`, or anything crossing main/renderer boundaries.                  |

## Loading Order

1. Always load `@.agents/rules/code-standards.md`.
2. Load `@.agents/rules/architecture.md` before modifying structure or responsibilities.
3. Load `@.agents/rules/react.md` for renderer work in `src/renderer/**`.
4. Load `@.agents/rules/node.md` for backend work in `src/main/**`.
5. Load `@.agents/rules/electron.md` for IPC, `preload.ts`, `src/shared/**`, or process-boundary work.
6. Load `@.agents/rules/tests.md` whenever tests are involved.

## Useful Commands

- `nvm use && npm install`: use the Node version from `.nvmrc` and install dependencies.
- `npm run dev`: start the app in development mode.
- `npm run start:debug`: start the app with remote debugging on port `9222`.
- `npm test`: run the Jest suite with coverage.
- `npm run lint`: run ESLint with zero warnings allowed.
- `npm run format`: check Prettier formatting.
- `npm run format:write`: apply Prettier formatting.
- `npm run package`: package the app.
- `npm run make`: build installers.
