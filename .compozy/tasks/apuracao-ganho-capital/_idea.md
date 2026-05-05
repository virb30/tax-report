# B3 Capital Gains Assessment

## Overview

This feature adds a new, additive capital gains assessment workflow for Brazilian
individual investors with B3 spot-market assets: stocks, FIIs, and ETFs. Its central
purpose is to calculate monthly realized gains and losses, including exempt stock-sale
months under the R$ 20,000 monthly sales threshold, and turn those assessed results into
annual IRPF-ready evidence.

V1 should not modify existing app functionality. The current import, positions, asset
catalog, and Bens e Direitos annual report workflows must keep their existing behavior.
This feature should consume existing transaction, fee, asset, and position data as source
facts and expose a separate Renda Variavel assessment surface.

The annual declaration is an output of the feature, not the core objective. The core
objective is trustworthy monthly capital gains/loss assessment with enough traceability
for the user to understand taxable, exempt, compensated, pending, and unsupported results.

## Problem

Brazilian individual investors must apportion Renda Variavel results month by month. They
need to know whether a month produced taxable gains, deductible losses, exempt gains, or
pending results that cannot be trusted yet. For stocks, ordinary monthly sales up to
R$ 20,000 may generate exempt gains, but those gains still matter for the annual
declaration. FIIs and ETFs follow different treatment and should not inherit the stock
exemption by accident.

The current app already supports portfolio import, position calculation, asset metadata,
and annual Bens e Direitos output. It does not yet provide a separate capital gains/loss
assessment for Renda Variavel. Without this, users still need spreadsheets or external tax
tools to determine monthly gains, losses, exemption status, and annual Renda Variavel
values.

The risk is false confidence. A tax feature must not produce declaration-facing numbers
when source data is incomplete, unsupported, or ambiguous. V1 should therefore use
status-driven output: ready results when data is sufficient, pending results when user
action is needed, and unsupported results when the current scope cannot safely calculate
the case.

### Market Data

B3 ended 2025 with almost 5.5 million individual CPFs in renda variavel and roughly
R$ 635B-R$ 636B in custody. Individual investors traded R$ 517.3B in stocks in 2025,
while broader spot-market volume across stocks, BDRs, ETFs, FIIs, and related products
reached R$ 747.7B. ETFs grew 24% in number of investors in 2025.

Receita Federal requires annual declaration when exchange-like transactions exceed
R$ 40,000 in the year or when the taxpayer has taxable net gains. Receita's Renda
Variavel flow requires month-by-month values for gains/losses, FIIs/FIAGRO, IRRF,
DARF 6015, and prior-year losses. ReVar validates the demand for simplification, but its
first version excludes futures, options, term market, securities lending, and gold
financial asset.

Sources include Receita Federal Renda Variavel guidance, Receita ReVar guidance, B3 2025
investor publications, and competitor references from Grana, Mycapital, Velotax,
TradeBox, IR Bot, Kativo, and Minha Grana.

### Summary / Differentiator

The differentiator is an audit-first capital gains assessment. Instead of only showing
final tax numbers, the product explains monthly gains, losses, exempt results,
compensation, and pending blockers using source transactions and explicit rule
classification.

## Core Features

| #   | Feature                         | Priority | Description                                                                                                           |
| --- | ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| F1  | Monthly Capital Gains Assessment | Critical | Calculate realized gains and losses by month for supported B3 spot-market assets.                                     |
| F2  | Exempt Stock Sale Classification | Critical | Identify ordinary stock months where total monthly sales are at or below R$ 20,000 and classify gains as exempt.      |
| F3  | Asset-Specific Rule Separation   | Critical | Keep stocks, FIIs, and ETFs under separate tax treatment so FIIs/ETFs do not inherit stock exemption behavior.        |
| F4  | Loss Tracking for Annual Evidence | Critical | Surface monthly losses and their use/availability for supported compensation rules without generating DARF in V1.     |
| F5  | Ready/Pending/Unsupported Status | Critical | Mark each monthly assessment as ready, pending, or unsupported so incomplete inputs never become confident outputs.    |
| F6  | Calculation Trace                | High     | Show source transactions, costs, fees, average cost, sale proceeds, and rule classification behind each result.        |
| F7  | Annual IRPF Summary Output       | High     | Consolidate assessed monthly results into annual values useful for manual IRPF declaration.                           |
| F8  | Future DARF Compatibility        | Medium   | Preserve monthly tax concepts needed for later DARF generation, IRRF, and paid-tax memory without shipping them in V1. |

## Integration with Existing Features

| Integration Point                 | How                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Existing import data              | Read existing imported transactions and fees as source facts; do not change import behavior in V1.    |
| Existing positions and average price | Reuse calculated position/cost-basis facts where applicable; do not change current position screens. |
| Existing Bens e Direitos report   | Keep the current annual holdings report unchanged; this feature may provide a separate summary.       |
| Existing asset catalog            | Read asset type metadata to apply stock/FII/ETF-specific rules; missing or ambiguous metadata is pending. |

## KPIs

| KPI                            | Target                                                                | How to Measure                                                                 |
| ------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Monthly assessment coverage    | >= 90% of supported transaction months produce ready or pending results | Count monthly assessment statuses in representative B3 spot-market fixtures.   |
| Exempt classification correctness | 100% of stock months around the R$ 20,000 sale threshold are correct | Domain tests for below, equal, and above threshold scenarios.                  |
| Unsupported safety             | 100% of unsupported operations are surfaced and excluded from ready calculations | Tests with derivatives, day trade, exterior, ambiguous assets, and movements. |
| Trace completeness             | 100% of ready monthly results include source references and components | Contract/domain tests asserting trace data for every ready output.             |
| Existing feature preservation   | 0 regressions in existing import, positions, asset catalog, and Bens e Direitos tests | Existing Jest suite plus focused regression tests.                             |

## Feature Assessment

| Criteria            | Question                                            | Score   |
| ------------------- | --------------------------------------------------- | ------- |
| **Impact**          | How much more valuable does this make the product?  | Must do |
| **Reach**           | What % of users would this affect?                  | Strong  |
| **Frequency**       | How often would users encounter this value?         | Strong  |
| **Differentiation** | Does this set us apart or just match competitors?   | Strong  |
| **Defensibility**   | Is this easy to copy or does it compound over time? | Maybe   |
| **Feasibility**     | Can we actually build this?                         | Strong  |

Leverage type: Strategic Bet

## Council Insights

- **Recommended approach:** Build a separate, additive monthly capital gains assessment
  workflow for supported B3 spot-market assets, then provide annual IRPF summaries from
  those assessed monthly results.
- **Key trade-offs:** A full DARF engine would be more complete but too broad for V1;
  annual-only formatting would miss the real monthly nature of Renda Variavel; the hybrid
  keeps the tax model honest while limiting delivery scope.
- **Risks identified:** Receita rule complexity, incomplete import data, asset-type
  ambiguity, false confidence in tax-facing output, and competitive pressure from ReVar
  and established tax apps.
- **Stretch goal (V2+):** Add DARF calculation, IRRF treatment, paid DARF memory,
  prior-year loss carryforward, ReVar/B3 reconciliation, and accountant-friendly exports.

## Out of Scope (V1)

- **Changing existing import, positions, asset catalog, or Bens e Direitos behavior** -
  V1 must be additive and preserve all existing workflows.
- **DARF generation and payment workflow** - The monthly assessment should prepare the
  ground, but payment and DARF issuance are deferred.
- **Derivatives, options, futures, term market, securities lending, and gold financial
  asset** - These add substantial rule complexity and should remain unsupported in V1.
- **Foreign assets and offshore rules** - These require different tax treatment and would
  dilute the B3 spot-market scope.
- **Direct submission or official IRPF file generation** - V1 should provide auditable
  values for manual declaration, not automated filing.
- **Automated B3/ReVar account integration** - This requires a separate consent, token,
  privacy, and security design.

## Architecture Decision Records

- [ADR-001: Additive Monthly Assessment Before DARF Engine](adrs/adr-001.md) - V1 should
  add a separate monthly capital gains/loss assessment workflow that preserves existing
  functionality and defers DARF generation.

## Open Questions

- Should BDRs be excluded from V1 even though the existing app has BDR asset support?
- Should V1 treat day trade as unsupported, or include it as a separate supported category
  from the start?
- Should V1 include dividends, JCP, and FII distributions, or focus strictly on realized
  capital gains/losses from sales?
- Should loss carryforward only be displayed as assessment evidence in V1, or actively
  applied within supported monthly compensation rules?

