# Backend Module Reorganization

## Summary
Adopt a backend structure where `backend/src/main.ts` is the only global bootstrap, and each bounded context owns a class-based `*.module.ts` that composes its local dependencies on instantiation.

The target behavior is:
- `main.ts` instantiates only global infrastructure such as config, database connection, `Http`, and `Queue`.
- Each context module instantiates its repositories, services, use cases, controllers, and event handlers internally.
- Controllers are classes and register their HTTP endpoints in the constructor through the existing `Http` interface.
- Event handlers/subscribers are classes and register themselves in the constructor through `Queue`.
- Each module exposes only an `exports` property with the minimum facade/API needed by other modules.
- No central HTTP route registry remains; route registration happens as a side effect of module/controller instantiation.

## Implementation Changes
- Update project rules first so they describe the new backend standard before any production migration.
  - `folder-structure.md`: replace the current backend guidance with `*.module.ts` per context, `transport/http/controllers`, `transport/http/validation`, and `transport/queue/handlers`.
  - `architecture.md`: define `main.ts` as the global composition root, `*.module.ts` as local composition roots, controllers as transport adapters, and module `exports` as the only allowed cross-context surface.
  - `backend.md`: require class-based controllers/handlers, constructor-based self-registration, and forbid central route composition as the default pattern.
  - `code-standards.md`: add naming guidance for `*.module.ts`, `*.controller.ts`, and constructor-based registration where relevant.
  - `tests.md`: require focused tests for controllers, handlers, modules, and backward-compatible integration coverage during migration.
- Target folder organization:
  - `backend/src/main.ts`
  - `backend/src/shared/infra/http/**` for `Http`, `ExpressAdapter`, global middleware, error handling, and HTTP bootstrap helpers
  - `backend/src/<context>/<context>.module.ts`
  - `backend/src/<context>/transport/http/controllers/**`
  - `backend/src/<context>/transport/http/validation/**`
  - `backend/src/<context>/transport/events/handlers/**`
  - keep `domain/**`, `application/**`, and local `infra/**` per context
- Replace module factories/containers with class-based modules.
  - A module constructor receives global dependencies and any upstream module `exports` it needs.
  - The constructor wires local repositories, services, use cases, controllers, and handlers immediately.
  - The module exposes `exports` as an instance property; no `register()`, `start()`, `static`, or singleton API.
- Remove the current central HTTP composition model over time.
  - Migrate logic from `backend/src/http/routes/**` into context-local controllers.
  - Retire `backend/src/app/infra/container/**` as responsibilities move into `main.ts`, `shared/infra/**`, and context `*.module.ts`.
  - Eliminate aggregated `useCases` objects as cross-layer integration surfaces.
- Migrate incrementally by context.
  - Start with `portfolio` as the pilot.
  - Then migrate `ingestion`.
  - Then migrate `tax-reporting`.
  - Remove legacy route/container wiring only after all contexts are on the new pattern.

## Current Migration Status
- Rules were updated in `docs/rules/**` as writable copies of the target guidance. Syncing the same content back into `.agents/rules/**` is still pending because that mount was read-only during the first step of the migration.
- `portfolio` is already on the new pattern through `backend/src/portfolio/portfolio.module.ts`, with controllers in `transport/http/controllers` and queue subscription in `transport/queue/handlers`.
- The shared HTTP contract was simplified so controllers register routes through `Http.on(...)`, `ExpressAdapter` encapsulates `listen()`, and route-local middleware is declared through `HttpMiddlewareSpec`.
- `ingestion` is now on the new pattern through `backend/src/ingestion/ingestion.module.ts`, with:
  - composition moved into the module constructor
  - controllers in `transport/http/controllers`
  - local HTTP validation in `transport/http/validation`
  - local upload middleware specs in `transport/http/middleware`
  - `exports` reduced to `dailyBrokerTaxRepository`
- `tax-reporting` is now on the new pattern through `backend/src/tax-reporting/tax-reporting.module.ts`, with:
  - composition moved into the module constructor
  - controllers in `transport/http/controllers`
  - local HTTP validation in `transport/http/validation`
  - queue subscription moved to `transport/queue/handlers`
  - `exports` reduced to an empty facade
- The explicit cross-context exception in `portfolio` was removed:
  - `backend/src/portfolio/portfolio.module.ts` no longer instantiates `ImportConsolidatedPositionUseCase`
  - consolidated import endpoints were re-homed under `ingestion` transport while preserving the existing `/api/positions/**` URLs
- The central HTTP registry was collapsed:
  - `backend/src/http/routes/imports.route.ts` was removed
  - `backend/src/http/routes/daily-broker-taxes.route.ts` was removed
  - `backend/src/http/routes/monthly-tax.route.ts` was removed
  - `backend/src/http/routes/reports.route.ts` was removed
  - `backend/src/http/routes/index.ts`, `route-context.ts`, `async-route.ts`, and `health.route.ts` were removed
- Runtime startup moved part of the way toward the target state:
  - `backend/src/main.ts` now starts the process through `backend.http.listen(...)`
  - `backend/src/http/app.ts` still acts as the practical global composition root and still owns health/error middleware registration
  - `backend/src/http/app.ts` no longer depends on startup hooks or central route registration
- Transitional factory wrappers still exist in `infra/container/index.ts` for `portfolio`, `ingestion`, and `tax-reporting`, but they now delegate to the class-based modules instead of owning composition.

## Remaining Next Steps

### Phase 1 - Remove The Cross-Context Exception In `portfolio`
- Status: completed.
- Move ownership of `ImportConsolidatedPositionUseCase` and `CsvXlsxConsolidatedPositionParser` out of `backend/src/portfolio/portfolio.module.ts`.
- Keep the existing HTTP contract stable for the UI:
  - preserve `POST /api/positions/consolidated-preview`
  - preserve `POST /api/positions/consolidated-import`
- Re-home those endpoints under the future `ingestion` transport layer, even if the URL continues to live under `/positions/**`.
- Remove these imports from `portfolio` after the move:
  - `../ingestion/application/use-cases/import-consolidated-position.use-case`
  - `../ingestion/infra/parsers/csv-xlsx-consolidated-position.parser`
- Update `backend/src/portfolio/transport/http/controllers/position.controller.ts` so it no longer depends on `ImportConsolidatedPositionUseCase`.
- Acceptance criteria:
  - `portfolio` no longer imports application or infrastructure types from `ingestion`
  - consolidated import behavior, status codes, and payload shapes remain unchanged

### Phase 2 - Migrate `ingestion` To `ingestion.module.ts`
- Status: completed.
- Create `backend/src/ingestion/ingestion.module.ts` as the local composition root for the context.
- Move composition out of `backend/src/ingestion/infra/container/index.ts` into the module constructor:
  - repositories
  - parsers
  - services
  - use cases
- Add HTTP controllers in `backend/src/ingestion/transport/http/controllers/**`:
  - `import.controller.ts`
  - `daily-broker-tax.controller.ts`
  - optionally `consolidated-position-import.controller.ts` if the consolidated endpoints become clearer as a dedicated adapter
- Add HTTP validation in `backend/src/ingestion/transport/http/validation/ingestion-http.schemas.ts`.
- Extract semantic route-local middleware specs in `backend/src/ingestion/transport/http/middleware/**`:
  - `transaction-upload.middleware.ts`
  - `daily-broker-tax-upload.middleware.ts`
  - `consolidated-position-upload.middleware.ts` if consolidated endpoints land in this context
- Register all `ingestion` routes in controller constructors via `Http.on(...)`.
- Replace the current public surface with `exports`, starting with the minimum downstream dependency:
  - `dailyBrokerTaxRepository`
- Update `backend/src/http/app.ts` to instantiate `new IngestionModule(...)` instead of `createIngestionModule(...)`.
- Remove legacy HTTP wiring after controller registration is in place:
  - `backend/src/http/routes/imports.route.ts`
  - `backend/src/http/routes/daily-broker-taxes.route.ts`
- Reduce or remove `ingestion` usage from:
  - `backend/src/http/routes/index.ts`
  - `backend/src/http/routes/route-context.ts`
  - `backend/src/app/infra/container/types.ts`
- Acceptance criteria:
  - no `ingestion` route is registered from `backend/src/http/routes/**`
  - downstream modules no longer depend on `ingestion.useCases`, `ingestion.parsers`, or `ingestion.services`

### Phase 3 - Migrate `tax-reporting` To `tax-reporting.module.ts`
- Status: completed.
- Create `backend/src/tax-reporting/tax-reporting.module.ts` as the local composition root for the context.
- Move composition out of `backend/src/tax-reporting/infra/container/index.ts` into the module constructor.
- Add HTTP controllers in `backend/src/tax-reporting/transport/http/controllers/**`:
  - `monthly-tax.controller.ts`
  - `report.controller.ts`
- Add context-local validation in `backend/src/tax-reporting/transport/http/validation/tax-reporting-http.schemas.ts` if the route schemas stop being shared.
- Move `RecalculateMonthlyTaxCloseHandler` to `backend/src/tax-reporting/transport/queue/handlers/recalculate-monthly-tax-close.handler.ts`.
- Register the queue subscription in the constructor and remove the current `startup.initialize()` guard.
- Define the smallest viable `exports` surface for the context:
  - prefer an empty or minimal facade
  - do not expose `useCases` as a cross-context integration contract
- Update `backend/src/http/app.ts` to instantiate `new TaxReportingModule(...)` and pass only `portfolio.exports` plus `ingestion.exports`.
- Remove legacy HTTP wiring after the controllers exist:
  - `backend/src/http/routes/monthly-tax.route.ts`
  - `backend/src/http/routes/reports.route.ts`
- Acceptance criteria:
  - `tax-reporting` no longer depends on startup hooks for handler registration
  - no `tax-reporting` route is registered from `backend/src/http/routes/**`

### Phase 4 - Collapse The Remaining Central HTTP And Container Wiring
- Status: in progress.
- Completed in this phase:
  - `registerApiRoutes(...)` and the remaining `backend/src/http/routes/**` artifacts were removed
  - `ApiRouteContext` was removed
  - `backend/src/http/routes/async-route.ts` was removed
  - `backend/src/main.ts` now starts the server through `Http.listen(...)`
  - runtime startup no longer depends on `startup.initialize()`
- Keep only one route-error normalization path in shared HTTP infrastructure; do not maintain duplicated normalization logic in both the adapter and legacy helper.
- Rework runtime bootstrap so `backend/src/main.ts` becomes the actual global composition root described by this plan:
  - instantiate config
  - instantiate database/shared infrastructure
  - instantiate `ExpressAdapter`
  - instantiate context modules
  - start the server through `Http.listen(...)`
- Stop using `backend.app.listen(...)` as the canonical startup path.
- Reduce `backend/src/http/app.ts` to a thin test helper or remove it entirely if the test suite no longer needs an injectable factory.
- Remove transitional container artifacts once imports are updated:
  - `backend/src/app/infra/container/app-module.ts`
  - `backend/src/ingestion/infra/container/index.ts`
  - `backend/src/tax-reporting/infra/container/index.ts`
  - `backend/src/portfolio/infra/container/index.ts`
  - `backend/src/portfolio/infra/handlers/recalculate-position.handler.ts`
- Revisit `backend/src/app/infra/container/types.ts` and keep only types that still represent real shared contracts after the migration.
- Acceptance criteria:
  - runtime composition no longer depends on factory containers
  - runtime startup no longer depends on `startup.initialize()`
  - the adapter is the only place that encapsulates Express startup mechanics

### Phase 5 - Replace Legacy Coverage With Module-Centric Coverage
- Status: in progress.
- Completed in this phase:
  - `backend/src/ingestion/ingestion.module.spec.ts` was added
  - `backend/src/tax-reporting/tax-reporting.module.spec.ts` was added
  - queue-handler coverage was moved to `transport/queue/handlers`
  - `backend/src/http/app.spec.ts` was updated to stop assuming startup hooks
  - `backend/src/http/routes/workflow-routes.integration.spec.ts` now validates the module-driven route registration path through `createBackendApp(...)`
- Add focused specs for the remaining migrated contexts:
  - `backend/src/ingestion/ingestion.module.spec.ts`
  - `backend/src/tax-reporting/tax-reporting.module.spec.ts`
- Add controller specs for the new `ingestion` and `tax-reporting` transport adapters.
- Add or move queue-handler specs to the new `transport/queue/handlers` locations.
- Update `backend/src/http/app.spec.ts` to remove assumptions about container factories and startup hooks after the bootstrap cleanup.
- Replace or adapt `backend/src/http/routes/workflow-routes.integration.spec.ts` so it verifies module-driven route registration instead of a central route registry.
- Remove obsolete tests that only protect deleted factories or deleted route files after replacement coverage is green.
- Sync the final rule text from `docs/rules/**` back into `.agents/rules/**` once the filesystem allows writes there.

## Public Interfaces And Contracts
- Keep the existing `Http` abstraction as the transport boundary used by controllers.
- Keep `ExpressAdapter` as one implementation of `Http`; future adapter swaps should only affect `main.ts` and shared HTTP infrastructure.
- Standardize module construction around class instantiation, for example `new PortfolioModule(...)`.
- Standardize cross-context exposure as `module.exports`, containing only the minimum facade/API needed by downstream modules.
- Do not expose repositories, central route registries, or raw framework objects across context boundaries unless a migration step temporarily requires it.

## Test Plan
- Rule/documentation tests:
  - Verify updated rules no longer prescribe central route registration or `infra/container` as the default backend composition model.
- Controller tests:
  - Ensure each controller registers its routes on construction via `Http`.
  - Validate syntactic parsing/validation stays in controller or `transport/http/validation`.
- Handler tests:
  - Ensure each handler subscribes to the correct queue events on construction.
  - Verify event-to-use-case delegation remains unchanged.
- Module tests:
  - Ensure module instantiation wires local dependencies correctly and exposes the expected `exports`.
  - Ensure downstream modules can be instantiated from upstream `exports` without reaching into internal repositories.
- Integration tests:
  - Preserve end-to-end HTTP coverage while migrating each context.
  - Add or adapt integration tests so `main.ts` bootstraps modules without central route registration.
  - Confirm no regressions in route behavior, validation errors, event-driven flows, and startup sequence.

## Assumptions And Defaults
- `backend/src/main.ts` remains the backend entrypoint and becomes the only global bootstrap/composition root.
- Controller endpoint registration and handler subscription both happen in constructors.
- Module lifecycle is implicit on instantiation; no separate `init`, `register`, or `start` methods.
- The module public surface is named `exports`, not `api`.
- `exports` is instance-based and not static; modules are not singletons by design.
- Validation at HTTP boundaries covers syntax and simple constraints only; semantic validation remains in application/domain layers.
- The migration starts by updating the project rules, and those rules must be the first artifacts to reflect the new architecture.
