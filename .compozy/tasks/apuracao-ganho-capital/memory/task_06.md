# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Expose Capital Gains Assessment through IPC and Awilix container wiring.

## Important Decisions
- Used `.inject()` for `GenerateCapitalGainsAssessmentUseCase` in the container to map parameter names (`query`, `assessmentService`, `lossCompensationService`) to registered component names.
- Added explicit integration test coverage in `ipc-handlers.integration.test.ts` to verify the full IPC pipeline for capital gains.

## Learnings
- `InjectionMode.CLASSIC` in Awilix depends on constructor parameter names matching registered keys unless `.inject()` is used.
- Sparse month reporting in `CapitalGainsLossCompensationService` means empty years return `months: []`.

## Files / Surfaces
- `src/preload/contracts/tax-reporting/report/contracts.ts` (IPC contract)
- `src/preload/renderer/electron-api.ts` (Renderer API typing)
- `src/preload/ipc/ipc-channels.ts` (Channel whitelist)
- `src/main/tax-reporting/transport/handlers/report/report-ipc-handlers.ts` (IPC handler)
- `src/main/tax-reporting/transport/registrars/report-ipc-registrar.ts` (IPC registrar)
- `src/main/app/infra/container/index.ts` (Container registration)
- `src/main/app/transport/handlers/ipc-handlers.integration.test.ts` (Integration tests)
- `src/main/tax-reporting/transport/registrars/report-ipc-registrar.test.ts` (New registrar test)
- `src/preload/contracts/tax-reporting/report/contracts.test.ts` (New contract validation test)

## Errors / Corrections
- Fixed `AwilixResolutionError: Could not resolve 'query'` by adding explicit injection for the use case.
- Updated integration test expectation for `months` to `toBeInstanceOf(Array)` to handle empty year results.

## Ready for Next Run
Backend is fully wired. Task 07 can now implement the renderer page using `window.electronApi.generateCapitalGainsAssessment`.
