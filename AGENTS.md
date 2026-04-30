# Repository Guidelines

Load these rules before executing any task:

@.agents/rules/architecture.md
@.agents/rules/code-standards.md
@.agents/rules/tests.md
@.agents/rules/react.md
@.agends/rules/node.md
@.agents/rules/electron.md

## Project Structure & Module Organization

This is an Electron Forge + Vite TypeScript desktop app for Brazilian variable income tax workflows. Core code lives in `src/`:

- `src/main/`: Electron main process, IPC controllers, database, infrastructure, application use cases, and domain logic.
- `src/renderer/`: React renderer app, pages, components, styles, and browser-facing API services.
- `src/shared/`: contracts and shared types used across main, preload, and renderer boundaries.
- `src/preload.ts`: secure IPC bridge exposed to the renderer.
- `docs/`: PRDs, tech specs, task notes, reports, and sample CSV files under `docs/tests/`.
- `scripts/electron-playwright-mcp/`: local tooling for Electron Playwright MCP workflows.

Tests are colocated with implementation using `.test.ts`, `.spec.ts`, and `.e2e.test.tsx` suffixes.

## Build, Test, and Development Commands

- `nvm use && npm install`: use Node `24.13.1` from `.nvmrc` and install dependencies.
- `npm run dev` or `npm start`: rebuild native modules and start Electron Forge in development mode.
- `npm run start:debug`: start with remote debugging on port `9222`.
- `npm test`: rebuild `better-sqlite3`, run Jest, and collect coverage.
- `npm run lint`: run ESLint for `.ts` and `.tsx` files with zero warnings allowed.
- `npm run format`: check Prettier formatting.
- `npm run format:write`: apply Prettier formatting.
- `npm run package`: package the app without installers.
- `npm run make`: build distributable installers.

## Coding Style & Naming Conventions

Use TypeScript throughout. Prettier enforces single quotes, semicolons, trailing commas, and a `100` character print width. ESLint uses type-checked `@typescript-eslint` rules, rejects `any`, and requires consistent type-only imports.

Follow existing naming patterns: domain objects use suffixes like `.entity.ts`, `.vo.ts`, and `.service.ts`; use cases use `*.use-case.ts`; IPC contracts use `*.contract.ts`; repositories use `*.repository.ts`.

Avoid using "utils" pattern in backend `src/main/**/*.ts`. Try to express the utility as part of a class or a function inside a relevant module.

## Implementation Architecture Rules

Before adding behavior to an existing page, entity, parser, controller, or IPC boundary, identify the responsibility being changed and keep it named in the code. Do not let orchestration, state, validation, transport details, and presentation grow together in the same module.

- For React pages, keep pages as composition roots. Move async workflows, IPC calls, submit handlers, modal state, and derived page state into a focused `use...` hook; move forms, tables, and modals into named components.
- Watch page hooks for becoming the next god module. If a hook accumulates many independent state groups, public commands, or effects, split commands, queries, or form state into smaller page-local modules.
- For domain entities, extract a class only when a cohesive sub-rule has its own data and operations, such as allocation, calculation, or normalization state. Avoid extracting merely to reduce line count.
- For parsers and import flows, express multi-step work as named phases such as load, normalize, resolve, group, validate, and serialize. If a phase grows its own policy, move it behind a named module and test it directly.
- For IPC, preload, HTTP-like, CLI, queue, or other technical boundaries, keep channel names, payload parsing, validation, and error semantics in one shared, tested contract instead of repeating string literals or ad hoc validation in controllers.
- When extracting a responsibility, add focused tests for the new module or contract before relying only on broader integration coverage.

## Testing Guidelines

Jest with `ts-jest` is the primary test runner. Global coverage thresholds are `80%` for branches, functions, lines, and statements. Coverage is collected from `src/main/**/*.ts` and `src/preload.ts`, excluding `src/main/main.ts`.

Prefer focused tests next to the code they verify, for example `money.vo.spec.ts`, `database.test.ts`, or `App.e2e.test.tsx`. Run `npm test` before submitting changes that affect behavior.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commit-style prefixes such as `feat:`, `fix:`, `chore:`, `docs:`, and `refactor:`. Keep commits focused and imperative, for example `feat: add broker activation use case`.

Pull requests should include a concise summary, validation commands run, linked issue or task document when applicable, and screenshots or recordings for renderer UI changes. Note database migration or native module impacts explicitly.
