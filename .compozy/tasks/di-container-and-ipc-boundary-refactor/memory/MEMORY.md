# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- Task 01 moved public IPC contracts and generic contract helpers into `src/ipc/**`; `src/preload/contracts/**` no longer exists.
- Task 03 moved backend-owned domain/import/report enum semantics to `src/main/shared/types/domain.ts`; `src/shared/types/domain.ts` is now an empty module and should not regain public or backend domain exports.
- Task 04 replaced the main global Awilix container with `createMainBootstrap(database)` and context-owned container registrars under each main bounded context.

## Shared Decisions
- `src/ipc/contracts/domain.ts` owns renderer-facing DTO enums that mirror shared/domain enum values for the public IPC boundary.
- `src/main/shared/types/domain.ts` owns backend-only cross-context enum values and internal import DTO-adjacent shapes that are shared by main bounded contexts.
- `src/main/app/infra/container/shared-infrastructure.ts` is the root-owned place for shared infrastructure registrations such as database, queue, and cross-context singleton services.

## Shared Learnings
- Renderer imports now target `src/ipc/public`; main application/domain code should avoid `src/ipc/contracts/**` and define application-owned models with transport mapping in handlers.

## Open Risks

## Handoffs
- Future tasks should keep `src/shared` limited to process-agnostic utilities and avoid re-exporting `src/ipc` or `src/main` domain types through it.
- Future container work should use the bootstrap output instead of reintroducing a global container export; `main.ts` consumes `bootstrap.ipcRegistry` directly.
