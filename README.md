# Tax Report

Desktop application to support Brazilian variable income tax workflows.

## Requirements

- Node.js `24.13.1` (from `.nvmrc`)
- npm `>=10`

## Setup

```bash
nvm use
npm install
```

## Available Commands

- `npm run dev`: starts Electron Forge in development mode.
- `npm run start`: alias for development start.
- `npm run test`: runs Jest tests with coverage.
- `npm run lint`: runs ESLint over TypeScript files.
- `npm run package`: packages the app without installers.
- `npm run make`: creates distributable installers.
- `npm run shadcn`: runs shadcn/ui CLI commands.

## Development Runtime Variables

- `MAIN_WINDOW_VITE_DEV_SERVER_URL`: injected by Electron Forge + Vite during `npm run dev`.
- `MAIN_WINDOW_VITE_NAME`: renderer target name used to resolve built HTML in packaged mode.

## Project Structure

```text
src/
  main/        # Electron main process
  renderer/    # React renderer process
  shared/      # Shared contracts and types
  preload.ts   # Secure IPC bridge
```

## Task 1.0 Deliverables

- Electron Forge + Vite + TypeScript setup.
- React + React Router renderer with a basic `Hello World` screen.
- Tailwind CSS configured for renderer files.
- shadcn/ui initialized through `components.json`.
- Jest + ts-jest configured with smoke and infrastructure tests.
- ESLint + Prettier configured for baseline quality checks.
