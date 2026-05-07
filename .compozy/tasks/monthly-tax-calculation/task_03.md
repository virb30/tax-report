---
status: completed
title: Implement monthly asset classification and IRRF allocation services
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 03: Implement monthly asset classification and IRRF allocation services

## Overview
Implement the domain services that normalize upstream data into monthly-tax inputs before the full month calculator is
built. This task covers supported asset classification and daily IRRF allocation rules described in the TechSpec
"System Architecture", "Data Models", and "Testing Approach" sections.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST resolve monthly tax asset classes inside `tax-reporting` without expanding shared `AssetType`.
2. MUST classify supported monthly tax assets as `stock`, `unit`, `fii`, `etf`, or `unsupported` per the TechSpec.
3. MUST allocate daily IRRF rows across supported sale operations in a dedicated service and surface missing-data conditions for blocked months.
4. MUST include regression tests for supported, unsupported, and missing-input cases.
</requirements>

## Subtasks
- [x] 3.1 Create the monthly asset-class resolver service and its supporting types.
- [x] 3.2 Create the monthly IRRF allocator service and its supporting types.
- [x] 3.3 Cover supported asset resolution, unit derivation, and unsupported fallbacks with unit tests.
- [x] 3.4 Cover IRRF allocation, proportional distribution, and missing-tax blocking inputs with unit tests.

## Implementation Details
Use the TechSpec "Component Overview" and "Testing Approach" sections as the source of truth. Keep both services pure
and domain-focused so the month calculator can compose them without pulling in repository or IPC concerns.

### Relevant Files
- `src/main/tax-reporting/domain/report-generator.service.ts` — existing domain-service style reference inside `tax-reporting`.
- `src/main/tax-reporting/domain/declaration-eligibility.service.ts` — example of rule-focused service boundaries and spec coverage.
- `src/main/ingestion/application/repositories/daily-broker-tax.repository.ts` — upstream period-read seam consumed by IRRF allocation.
- `src/main/portfolio/application/repositories/asset.repository.ts` — canonical asset metadata source used by asset-class resolution.

### Dependent Files
- `src/main/tax-reporting/domain/services/monthly-tax-calculator.service.ts` — later month replay depends on both services.
- `src/main/tax-reporting/application/use-cases/recalculate-monthly-tax-history.use-case.ts` — later orchestration depends on normalized inputs from these services.
- `src/main/tax-reporting/infra/container/index.ts` — later composition must instantiate and inject the new services.

### Related ADRs
- [ADR-001: Define V1 Scope for Monthly Tax Calculation](adrs/adr-001.md) — fixes the supported asset scope for V1.
- [ADR-004: Persist Monthly Close Artifacts and Recalculate Forward Automatically](adrs/adr-004.md) — requires stable month inputs before persistence.

## Deliverables
- Monthly asset classification service with explicit supported and unsupported outcomes.
- Monthly IRRF allocation service with blocked-input signaling for missing daily tax data.
- Focused domain specs covering asset and IRRF rule behavior.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for monthly input normalization **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Resolver classifies stock-class assets ending in `11` as `unit` for monthly tax grouping without changing shared asset enums.
  - [x] Resolver returns `unsupported` when canonical asset metadata does not match the V1 supported scope.
  - [x] IRRF allocator distributes a stored daily IRRF amount across supported sale operations for the same day.
  - [x] IRRF allocator marks a required daily tax row as missing when a supported sale cannot be allocated safely.
- Integration tests:
  - [x] Monthly services can consume repository outputs from supported asset and daily tax records without adapter-specific assumptions.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Monthly calculation has stable domain services for asset grouping and IRRF normalization.
- Unsupported assets and missing IRRF facts are represented explicitly instead of being silently blended into tax output.
