# PRD: B3 Capital Gains Assessment

## Overview

This feature adds an additive Renda Variavel capital gains assessment workflow for
Brazilian individual investors with B3 spot-market stocks, FIIs, and ETFs.

The product helps users prepare annual IRPF Renda Variavel values by showing a selected
tax year as month-by-month assessed results. Each monthly row explains whether supported
operations produced taxable gains, exempt stock gains, compensated gains, losses, pending
results, or unsupported results.

The core value is annual declaration support without hiding the monthly basis required by
Receita Federal. V1 does not replace DARF tooling, does not file declarations, and does
not change existing import, positions, asset catalog, or Bens e Direitos workflows.

## Goals

- Provide an annual month-by-month Renda Variavel assessment for supported B3 spot-market
  stocks, FIIs, and ETFs.
- Help users manually fill IRPF annual Renda Variavel values with clearer monthly evidence.
- Correctly separate stock, FII, and ETF treatment so stock exemption rules do not leak
  into other asset classes.
- Classify stock months with total ordinary stock sales up to R$ 20,000 as exempt where
  applicable.
- Apply same-category loss compensation for supported operations inside the assessed
  annual view.
- Prevent false confidence by marking incomplete, ambiguous, day trade, or unsupported
  cases as pending or unsupported.
- Preserve existing product behavior for import, positions, asset catalog, and
  Bens e Direitos reports.

## User Stories

- As an individual investor preparing IRPF, I want to see Renda Variavel values month by
  month so that I can manually fill the annual declaration with confidence.
- As an individual investor, I want stock months under the R$ 20,000 sales threshold to be
  classified separately so that exempt gains are not mixed with taxable gains.
- As an individual investor, I want FIIs and ETFs to follow their own treatment so that I
  do not apply stock exemptions incorrectly.
- As an individual investor, I want losses to be compensated within supported categories
  so that the annual view reflects the values I need to review.
- As an individual investor, I want unsupported operations such as day trade to remain
  visible so that I know which months require external handling.
- As an individual investor, I want traces back to source transactions, costs, fees, and
  classifications so that I can review suspicious months before using the results.

## Core Features

### 1. Annual Month-by-Month Assessment

The product must let the user select a tax year and view monthly Renda Variavel
assessment rows for supported operations.

Each month must show:
- assessment status;
- supported asset category;
- taxable gain;
- exempt stock gain;
- monthly losses;
- same-category loss compensation;
- remaining loss balance for supported categories;
- pending or unsupported blockers;
- annual totals derived from monthly rows.

### 2. Asset-Specific Rule Separation

The product must treat stocks, FIIs, and ETFs as separate supported categories. Stock
exemption behavior must apply only to eligible stock operations. FIIs and ETFs must not
inherit the R$ 20,000 stock-sale exemption.

### 3. Exempt Stock Sale Classification

For supported ordinary stock operations, the product must classify months where total
stock sales are at or below R$ 20,000 as exempt when the month has a positive gain.
Exempt gains must remain visible because they may still matter for annual declaration
evidence.

### 4. Same-Category Loss Compensation

For supported operations, the product must apply same-category loss compensation in the
annual assessment view. The user must see how monthly losses reduce later supported gains
and whether losses remain after compensation.

V1 must not require users to manage paid DARF memory or prior-year loss entry as a full
tax-payment workflow.

### 5. Status-Driven Output

Each month must be assigned an explicit status:
- ready;
- pending;
- unsupported;
- mixed, when supported results exist but some operations require external handling.

Ready months may be used as annual evidence. Pending, unsupported, or mixed months must
show blockers and must not be presented as fully reliable annual output.

### 6. Calculation Trace

Ready and mixed months must expose enough trace detail for user review:
- source transactions;
- sale proceeds;
- acquisition cost basis;
- fees considered;
- average cost effects;
- asset category;
- exemption or taxable classification;
- loss compensation effects.

The trace supports trust and review, but the main V1 experience remains the annual
month-by-month table.

### 7. Unsupported Operation Visibility

Day trade operations are unsupported in V1. Derivatives, options, futures, term market,
securities lending, gold financial asset, foreign assets, and other out-of-scope
operations are also unsupported.

Unsupported operations must remain visible as blockers. The product must continue
assessing supported operations where possible instead of failing the entire year.

### 8. Annual IRPF Copy Support

The product must consolidate monthly assessed results into annual values useful for manual
IRPF entry. The annual support must be based on the monthly rows, not on separate
annual-only calculations.

## User Experience

The primary user journey is:

1. The user imports or already has transaction, fee, asset, and position data in the app.
2. The user opens the Renda Variavel assessment area and selects a tax year.
3. The product shows annual totals and a month-by-month table for supported stocks, FIIs,
   and ETFs.
4. The user reviews statuses to identify ready, pending, mixed, and unsupported months.
5. The user expands a month to inspect source transactions, fees, classification, and loss
   compensation.
6. The user uses ready annual values as manual IRPF evidence.
7. The user handles unsupported or pending months outside the product or resolves missing
   source data before relying on the output.

UX principles:
- Annual totals must never hide month-level blockers.
- Status language must be explicit and tax-facing.
- Unsupported day trade must be visible, not silently ignored.
- Copy-oriented values must be disabled or clearly blocked when the underlying month is
  not ready.
- The table should favor scanning across months over transaction-level detail.

## High-Level Technical Constraints

- The product must align with current Receita Federal Renda Variavel guidance for
  Brazilian resident individual investors.
- The product must preserve existing import, portfolio, asset catalog, position, and
  Bens e Direitos workflows.
- The product must use existing source facts where available and identify missing or
  ambiguous data as pending.
- The product must not imply official filing, DARF generation, or Receita/B3
  synchronization in V1.
- The product must keep supported and unsupported scope clear enough to prevent users from
  treating partial output as complete tax advice.

## Non-Goals (Out of Scope)

- DARF generation, DARF payment, or paid-tax memory.
- Direct submission to Receita Federal or official declaration-file generation.
- Automated B3, Receita, or ReVar account integration.
- Day trade calculation.
- BDR support in V1.
- Derivatives, options, futures, term market, securities lending, gold financial asset,
  foreign assets, cryptoassets, and offshore rules.
- Dividends, JCP, FII distributions, and income-reporting workflows.
- A transaction-ledger-first audit product.
- Changing existing Bens e Direitos report behavior.

## Phased Rollout Plan

### MVP (Phase 1)

The MVP includes:
- annual tax-year selector;
- month-by-month Renda Variavel assessment table;
- stock, FII, and ETF category separation;
- stock exemption classification for monthly stock sales up to R$ 20,000;
- same-category loss compensation for supported operations;
- annual totals derived from monthly rows;
- ready, pending, unsupported, and mixed statuses;
- visible blockers for day trade and other unsupported operations;
- expandable calculation trace for reviewed months.

Success criteria to proceed to Phase 2:
- users can identify which months are ready and which require external handling;
- supported stock exemption cases around the R$ 20,000 threshold classify correctly;
- FIIs and ETFs never receive stock exemption treatment;
- annual values are traceable to monthly assessed rows.

### Phase 2

Candidate additions:
- manual prior-year loss entry;
- richer review tools for pending months;
- exportable annual evidence packet;
- better accountant-facing summaries;
- support for additional source-data repair actions.

Success criteria to proceed to Phase 3:
- users can complete most supported annual Renda Variavel review without spreadsheets;
- pending-month resolution becomes clear and repeatable.

### Phase 3

Candidate additions:
- DARF calculation;
- IRRF treatment;
- paid DARF memory;
- BDR support if rules are confirmed and scoped;
- ReVar/B3 reconciliation;
- broader supported operation types.

Long-term success criteria:
- the product becomes a reliable monthly tax-preparation surface while maintaining
  explicit support boundaries.

## Success Metrics

- 100% of assessed months receive an explicit ready, pending, unsupported, or mixed
  status.
- 100% of unsupported day trade operations appear as blockers and are excluded from ready
  calculations.
- 100% of FIIs and ETFs are excluded from stock exemption treatment.
- 100% of stock threshold tests at below, equal to, and above R$ 20,000 classify
  correctly.
- 100% of ready monthly rows expose trace components needed for review.
- 0 regressions in existing import, positions, asset catalog, and Bens e Direitos
  workflows.
- At least 90% of supported-only fixture months produce ready annual evidence.

## Risks and Mitigations

- Users may treat partial annual output as complete tax advice.
  - Mitigation: use explicit statuses and block ready/copy affordances when months are
    pending, mixed, or unsupported.
- Users may expect DARF generation because competitors and ReVar emphasize payment
  support.
  - Mitigation: state that V1 is annual evidence and assessment support, with DARF
    deferred.
- Loss compensation may create false confidence if source history is incomplete.
  - Mitigation: mark months pending when required source history is missing or ambiguous.
- The annual table may become too dense.
  - Mitigation: show annual totals and monthly status first, with trace details behind
    expansion.
- Receita guidance may change.
  - Mitigation: keep scope tied to current guidance and treat rule updates as explicit
    product maintenance.

## Architecture Decision Records

- [ADR-001: Additive Monthly Assessment Before DARF Engine](adrs/adr-001.md) - V1 adds a
  separate monthly assessment workflow and defers DARF generation.
- [ADR-002: Annual Month-by-Month Assessment as V1 Product Approach](adrs/adr-002.md) -
  V1 prioritizes annual IRPF copy support through monthly assessed rows.

## Open Questions

- Should V1 show a single "mixed" status, or should supported-ready values and unsupported
  blockers be shown as separate status badges?
- Should the annual summary expose copy actions per Receita field, or only provide values
  for manual review?
- Should manual prior-year loss entry be deferred to Phase 2, or is it required for V1 to
  produce trustworthy compensation for users with prior losses?
