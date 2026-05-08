# Monthly Tax Calculation

## Overview

Build a first-class monthly tax close workflow for Brazilian individual investors based on recorded transactions. The
feature should calculate monthly tax due for regular cash-market operations in stocks, FIIs, ETFs, and units, while
showing an auditable explanation of how each month reached `no tax`, `exempt`, or `DARF due`.

The feature is for users who already import or maintain their portfolio in Tax Report but still need external
spreadsheets to close each month. The feature should live in a new top-level tab so the monthly close becomes a primary
product workflow rather than a hidden extension of positions or annual reporting. V1 should be substantial, not a toy
MVP: it should cover the mainstream use case completely, while staying narrow on market breadth and conservative on
ambiguous rule areas.

## Problem

Tax Report currently helps with transaction import, position tracking, and annual assets reporting, but it stops short
of the monthly obligation that creates the most recurring anxiety for active investors. A user can know their position
and average cost and still not know whether a given month generated tax, whether the stock exemption applied, how much
loss can be carried forward, or whether IRRF changed the final amount due. That gap forces users into spreadsheets or
third-party products.

This is a trust problem as much as a feature gap. A monthly tax result is only useful if the user can understand and
verify it. A black-box number is not enough. The product must show the facts behind the result: sales volume, realized
gain/loss, tax grouping, exemption logic, carried losses, IRRF, and final tax due. Without that, the feature risks
looking complete while still failing the user's real decision: whether they can rely on it to close the month.

The current product also has a precision mismatch. The domain already supports high-precision decimal arithmetic, but
the operational fee allocation still settles too early in cents. For monthly tax calculation, that can distort cost
basis, realized result, and carried losses over time. The same applies to transaction prices and average cost when the
user expects accounting-grade calculations rather than display-grade values.

### Market Data

The market already trains users to think in monthly tax workflows. Receita Federal's `ReVar` presents month-level
cards, taxable groups, carried losses, and payment-oriented outcomes. Category tools such as Mycapital and Grana
compete on the promise of monthly tax calculation and DARF readiness, which means this feature is close to the center
of the category, not an edge capability.

The opportunity is large enough to justify a core feature. B3 reported that individuals moved BRL `517.3` billion in
equities in 2025, and the FII market reached about `2.96` million investors in 2025. That supports treating monthly
tax close as a core value driver rather than a niche workflow.

### Summary / Differentiator

The differentiator should not be "we also calculate tax." It should be "we provide a monthly close you can trust."
That means combining tax calculation with auditability, precision, visible assumptions, and clear confidence signals
inside the same workflow.

### Integration with Existing Features

| Integration Point | How |
| --- | --- |
| New Monthly Tax tab | Add a dedicated top-level tab for month close, adjacent to positions and annual reporting. |
| Transaction import | Imported transactions remain the canonical input for monthly calculation. |
| Daily broker taxes | Daily fees and IRRF continue to feed allocation and month-level tax outcomes. |
| Positions | Average cost and holdings stay aligned with the same high-precision transaction history. |
| Asset catalog | Asset metadata determines the base asset class. In V1, units are derived only from assets whose base class is `stock` and whose ticker ends with `11`, preventing confusion with FIIs that also commonly end with `11`. |

## Core Features

| # | Feature | Priority | Description |
| --- | --- | --- | --- |
| F1 | Monthly Tax Close Workspace | Critical | Add a dedicated top-level tab where the user selects a month and sees the final outcome: `no tax`, `exempt`, or `DARF due`. |
| F2 | Rule-Aware Tax Grouping | Critical | Calculate monthly results separately for stocks, FIIs, ETFs, and units, including the BRL `20,000` exemption for stock sales and non-exempt monthly treatment for FIIs, ETFs, and units in V1. |
| F3 | Derived Unit Identification | Critical | Treat units in V1 as assets whose base class is `stock` and whose ticker ends with `11`, so they can follow distinct tax handling where needed without becoming a separate stored asset class. |
| F4 | High-Precision Cost Basis | Critical | Preserve `6` decimal places for transaction prices, average cost, and fee apportionment until the output boundary to reduce tax-basis drift. |
| F5 | Loss Carryforward and IRRF Tracking | High | Apply accumulated losses and withheld IRRF at the month level so the user sees the real tax base and final amount due. |
| F6 | Audit Memory and Confidence Signals | High | Show sales volume, realized gain/loss, exemption applied, carried losses, IRRF used, policy notes, and visible warnings when a month depends on a conservative interpretation. |
| F7 | Obsolete Month Handling and Recalculation | High | When transactions, classifications, or tax inputs change, mark affected months as `obsolete` and provide both per-month recalculation and full recalculation actions. |

### Sub-Features

- **Monthly persisted artifact** — Store a minimal monthly record with calculation version, policy flags, grouped results, carried losses, IRRF usage, final outcome, and obsolescence status.
- **Review-aware recalculation** — Expose why a month became obsolete and allow the user to recalculate that month or the full history.
- **Policy disclosure** — Show explicit notes whenever conservative V1 policy affects calculation, especially for units derived from `stock` tickers ending with `11`.

## KPIs

| KPI | Target | How to Measure |
| --- | --- | --- |
| Monthly tax activation | `> 40%` of active users with monthly sales within `60 days` | Track users with sell transactions who open the monthly tax screen. |
| Calculation coverage | `> 95%` of supported months end with a final status | Count months with supported stock/FII/ETF/unit operations that produce a closed result without blocker state. |
| Audit completeness | `> 85%` of calculated months show full breakdown | Measure months that render sales, gain/loss, exemption, IRRF, carried losses, and final tax due. |
| Month-close speed | Median `< 2 minutes` per already-imported month | Measure time from opening the month to final review/exit in the monthly workflow. |
| Trust correction rate | `< 3%` of reviewed months require manual value correction | Track months where users override or report a materially different value. |

## Feature Assessment

| Criteria | Question | Score |
| --- | --- | --- |
| **Impact** | How much more valuable does this make the product? | Must do |
| **Reach** | What % of users would this affect? | Strong |
| **Frequency** | How often would users encounter this value? | Strong |
| **Differentiation** | Does this set us apart or just match competitors? | Maybe |
| **Defensibility** | Is this easy to copy or does it compound over time? | Strong |
| **Feasibility** | Can we actually build this? | Strong |

Leverage type: Compounding Feature

## Council Insights

- **Recommended approach:** Build a narrow-in-breadth but trustworthy monthly tax engine for regular stock, FII, ETF,
  and unit workflows.
- **Key trade-offs:** trust vs speed of delivery, explicit vs derived unit distinction, minimal persisted monthly
  artifact vs heavyweight ledger, complete monthly close vs broader tax scope.
- **Risks identified:** ambiguous legal treatment for units, early rounding drift, historical inconsistency after
  reimports or reclassification, and overpromising confidence without visible assumptions.
- **Stretch goal (V2+):** add DARF workflow support, month locking, and deeper annual tax integration after the monthly
  trust loop is proven.

## Out of Scope (V1)

- **Day trade and separate day-trade taxation** — excluded to keep V1 focused on mainstream regular cash-market
  operations.
- **Options, short selling, subscriptions, and exotic regimes** — excluded because they expand tax breadth faster than
  trust in the core engine.
- **DARF payment automation or banking integration** — excluded because the core monthly calculation must be trusted
  before payment workflow expansion.
- **Full annual tax declaration automation** — excluded because V1 should first solve the recurring monthly obligation
  cleanly.
- **General rule configurability for end users** — excluded to avoid turning V1 into a tax platform before the base
  workflow is stable.

## Architecture Decision Records

- [ADR-001: Define V1 Scope for Monthly Tax Calculation](adrs/adr-001.md) — Defines a trustworthy monthly tax engine
  as the V1 direction, with conservative handling of units derived from stock tickers ending with `11`.

## Open Questions

- Define in TechSpec which input changes mark a month as obsolete by default. The expected baseline is: transaction
  edits, daily broker-tax edits, asset reclassification, and tax-rule version changes.

## References

- Receita Federal, Manual do ReVar:
  https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/manual
- Receita Federal, Ganho Líquido:
  https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/ganho-liquido
- Receita Federal, Cálculo e Pagamento do Imposto:
  https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/calculo-e-pagamento-do-imposto
- Lei 11.033/2004:
  https://www.planalto.gov.br/ccivil_03/_Ato2004-2006/2004/Lei/L11033compilado.htm
- B3, pessoa física no mercado:
  https://www.b3.com.br/pt_br/noticias/pessoa-fisica-8AA8D0CD9B99E6CA019BBDE4F9156E1A.htm
- B3, mercado de FIIs:
  https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/fundos-investimento/mercado-de-fundos-imobiliarios-fiis-atinge-marca-de-296-milhoes-de-investidores-em-2025/
