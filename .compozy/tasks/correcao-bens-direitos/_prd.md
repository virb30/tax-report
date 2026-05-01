# PRD: Bens e Direitos Correction

## Overview

This initiative corrects the app’s annual Bens e Direitos workflow for Brazilian variable-income assets so a self-service investor can trust the output used to fill the annual declaration.

Today the app can misclassify imported assets, split declaration content by broker when the declaration should be treated as one item, omit the prior-year field needed by the Receita flow, expose incomplete issuer data, and make initial balances hard to correct safely. The result is a report that looks usable before it is consistently trustworthy.

This PRD defines a focused MVP that fixes the end-to-end workflow for supported scope. It prioritizes declaration-ready output for a simple individual investor, while still giving visibility and guided resolution for pending or unsupported cases.

## Goals

- Produce a declaration-oriented annual Bens e Direitos report for supported assets that the user can trust for manual copy into the official declaration flow.
- Ensure every supported holding reaches an explicit state: ready to copy, pending user action, optional, below threshold, or unsupported.
- Prevent new supported holdings from silently entering the portfolio with unresolved asset type.
- Let users repair legacy classification problems, issuer metadata gaps, and initial-balance issues inside the product.
- Reduce off-app cleanup, ad hoc spreadsheet work, and manual database intervention for annual declaration preparation.
- Keep the MVP narrow enough to remain honest about supported scope while broad enough to solve the full user workflow for that scope.

## User Stories

- As an individual investor preparing my own annual declaration, I want the app to classify each supported holding correctly so the declaration group, code, and threshold behavior are reliable.
- As an individual investor with positions across brokers, I want one declaration item per ticker and asset type so I do not duplicate the same holding in multiple copied entries.
- As an individual investor, I want to see both the prior-year value and the base-year value for each item so I can fill the required annual declaration fields.
- As an individual investor, I want the app to show which items are ready, pending, optional, below threshold, or unsupported so I know what I can trust and what still needs work.
- As an individual investor, I want to correct bad historical asset typing inside the app so older imported data does not keep corrupting my annual report.
- As an individual investor, I want to complete missing issuer information inside the app so copied declaration text is not blocked by missing metadata.
- As an individual investor, I want to edit or replace an initial balance for a ticker and year across multiple brokers so my year-end positions stay consistent after corrections.

## Core Features

### 1. Asset Type Resolution and Review

The product must resolve asset type before a new supported holding is treated as ready. When imported data does not provide enough certainty, the user must review the ticker before confirmation. The product must remember the confirmed type so the same ticker does not repeatedly require the same manual correction.

This feature applies to both transaction import and consolidated position import. It also applies to manual flows that create the starting basis for year-end reporting.

### 2. Legacy Asset Type Repair

The product must identify legacy holdings whose asset type may have been created under old fallback behavior and provide an in-app correction flow by ticker. The user must be able to repair the type and then trust the annual report generated for affected years without needing direct database access or external scripts.

This repair flow is part of the MVP because a declaration-ready report is not trustworthy if historical data remains known-bad.

### 3. Declaration-Oriented Annual Report

The report must treat the declaration item, not the broker allocation, as the main unit of output. For supported scope, each ticker and asset type combination should produce one annual declaration item with consolidated context across brokers.

Each item must present:

- the declaration classification used by the Receita flow;
- the prior-year value;
- the current base-year value;
- whether the holding was acquired during the base year;
- the item status;
- any pending issues;
- the consolidated broker summary needed to support the description;
- the copyable declaration text when the item is ready.

The product must still show classification and year-end values for pending items so the user can understand the state of the holding, but it must not present those items as ready to copy.

### 4. Eligibility and Status Engine

The product must apply declaration eligibility rules by supported asset class and assign a visible status to each item. The MVP status model includes:

- required;
- optional;
- below threshold;
- pending;
- unsupported.

This engine is necessary so the product stops treating every positive position as equally declaration-ready. It also lets the user focus attention on what actually needs action.

### 5. Asset Catalog Maintenance for Annual Reporting

The product must provide an operational way to maintain ticker-level metadata required for the annual report, including asset type, issuer name, and issuer document details needed by the supported declaration experience.

The MVP should make incomplete records visible and easy to finish, especially when those gaps block a report item from becoming ready to copy. This maintenance flow is manual and targeted. Bulk enrichment is out of scope for the first release.

### 6. Editable Multi-Broker Initial Balance

The product must treat initial balance as an editable year-based document for a ticker, not as a one-off mutation with a single broker assumption. The user must be able to create, replace, edit, and delete an initial balance across multiple brokers for the same ticker and year.

This protects the annual report from hidden duplication and makes correction workflows practical for investors who need to fix starting positions before trusting year-end output.

### 7. Partial Workflow for Unsupported Lines

When the product encounters unsupported asset classes or unsupported events, it must continue processing supported data and surface unsupported lines as visible pending work. Unsupported lines must never disappear silently, and they must not be presented as declaration-ready output.

This allows the user to extract value from supported holdings while staying honest about what remains outside scope.

### 8. Explicit Scope Communication

The product must state its supported scope clearly in import, maintenance, and reporting flows. The MVP supported scope covers:

- supported asset classes: stocks, FIIs, ETFs, and BDRs;
- supported events already within the current product boundary that affect this workflow.

The product must also state that broader asset coverage and additional corporate events are future work, not hidden assumptions.

## User Experience

The primary user journey is:

1. The user imports transactions or consolidated positions, or records an initial balance for an earlier year.
2. The product resolves what it can automatically and routes unresolved or unsupported lines into explicit review states.
3. The user completes any missing ticker metadata that blocks annual declaration output.
4. The user repairs legacy ticker classification or initial-balance issues when the system identifies historical inconsistencies.
5. The user generates the annual Bens e Direitos report for a selected base year.
6. The report shows clear item statuses, prior-year and base-year values, and one declaration item per supported holding.
7. The user copies only the items marked ready, while pending and unsupported items remain visible and actionable.

UX principles for the MVP:

- Status language must be explicit and unambiguous.
- Copy actions must exist only where trust is high enough to justify them.
- Pending work must feel actionable, not hidden.
- Multi-broker holdings must read as one declaration item with consolidated context, not as fragmented output.
- Scope limitations must be visible at the moment they matter, especially during import and report review.

## High-Level Technical Constraints

- The product must stay aligned with current Receita Federal guidance for IRPF 2026 annual declaration behavior relevant to supported Bens e Direitos items.
- The annual report must support both required year-end fields used in the declaration flow: prior-year value and base-year value.
- The product must support annual declaration preparation for Brazilian resident individual investors using the current supported asset scope only.
- The product must preserve broker context where it helps the declaration description, without turning broker allocations into separate declaration items by default.
- The product must allow in-app correction of supported-data issues without relying on direct database manipulation or external operational steps.
- The product must distinguish ready, pending, and unsupported states clearly enough that incomplete items are never mistaken for declaration-ready output.

## Non-Goals (Out of Scope)

- Monthly tax calculation, DARF generation, or broader renda variável tax apportionment changes.
- Support for new asset classes beyond stocks, FIIs, ETFs, and BDRs in the MVP.
- Support for additional corporate events outside the current supported scope, including future patrimonial-event expansion.
- Automatic external enrichment of issuer metadata.
- Bulk import or bulk editing of asset catalog metadata in the MVP.
- A full accountant or advisor multi-client workflow.
- Full export of a completed declaration file for direct submission to official Receita software.

## Phased Rollout Plan

### MVP (Phase 1)

The MVP includes:

- asset type resolution and review at intake;
- legacy asset type repair;
- declaration-oriented annual report with one item per supported holding;
- prior-year and base-year values;
- eligibility and status engine;
- operational asset catalog maintenance for annual reporting;
- editable multi-broker initial balance;
- visible pending handling for unsupported lines;
- explicit supported-scope messaging.

Success criteria to proceed to Phase 2:

- supported items no longer become ready through silent type fallback;
- users can distinguish ready, pending, optional, below-threshold, and unsupported items in one report flow;
- users can repair supported-data blockers inside the app without external intervention;
- one supported holding across multiple brokers appears as one declaration item.

### Phase 2

Phase 2 can improve productivity and coverage around the corrected workflow without expanding into full new tax domains. Candidate additions include:

- faster bulk handling of ticker metadata cleanup;
- richer review tools for pending items;
- better guidance for historical correction flows;
- deeper report summarization for users with larger portfolios.

Success criteria to proceed to Phase 3:

- users complete annual declaration preparation for supported scope with minimal repeated manual work;
- pending resolution time decreases meaningfully for returning users.

### Phase 3

Phase 3 expands breadth rather than repairing the core supported workflow. Candidate directions include:

- broader asset taxonomy;
- broader patrimonial-event coverage such as amortization, subscription, and conversion;
- more advanced automation around declaration preparation.

Long-term success criteria:

- the product supports a wider share of real investor portfolios without weakening trust in declaration readiness;
- scope expansion happens through explicit product support, not implicit best effort.

## Success Metrics

- 100% of newly imported supported tickers reach an explicit asset-type state before they are treated as ready.
- 0 items with unresolved type, unsupported scope, or blocking pending issues expose an enabled copy action.
- 100% of supported multi-broker holdings in the report appear as one declaration item per ticker and asset type.
- 100% of ready items display both prior-year and base-year values.
- A majority of supported items for the primary self-service persona become declaration-ready without off-app data correction once required metadata is completed.
- Users can complete supported-data corrections for asset type, issuer metadata, and initial balance inside the app without manual database edits.

## Risks and Mitigations

- Users may assume the product supports more asset classes or events than it actually does.
  - Mitigation: show supported scope explicitly and route unsupported lines into a visible pending state.
- Users may distrust changed historical results after repairing legacy data.
  - Mitigation: make repair flows explicit, item-based, and easy to review before relying on the updated report.
- The MVP may feel too broad if every correction surface looks equally urgent.
  - Mitigation: prioritize a pending-first experience that highlights what blocks declaration readiness now.
- Missing issuer metadata may slow completion even when calculations are correct.
  - Mitigation: keep pending items visible in the report, explain why copy is blocked, and provide a direct path to complete metadata.

## Architecture Decision Records

- [ADR-001: Adopt an End-to-End Correction MVP for Bens e Direitos](adrs/adr-001.md) — Chooses a coherent MVP that corrects import, maintenance, report, and initial-balance flows together.
- [ADR-002: Continue with Supported Data and Surface Unsupported Lines as Pending Work](adrs/adr-002.md) — Allows partial progress for supported holdings while keeping unsupported scope explicit and non-copyable.

## Open Questions

- Should the MVP expose a portfolio-level summary that counts ready, pending, optional, below-threshold, and unsupported items before the user opens individual report details?
- Should optional items remain visible in the main default report view or be collapsed behind a filter to keep the primary workflow focused on required and pending items?
- Should the report emphasize “ready to copy” as the primary action label, or use a broader label that better distinguishes informational items from declaration-ready items?
