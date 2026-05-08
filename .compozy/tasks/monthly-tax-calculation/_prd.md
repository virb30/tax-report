# Monthly Tax Calculation

## Overview

Tax Report will add a first-class monthly tax close workflow for Brazilian individual investors who already maintain or
import their transaction history in the product. The feature will help users understand, month by month, whether they
owe no tax, qualify for an exemption, have tax due, or are below the BRL 10.00 collection threshold for regular
cash-market operations in stocks, FIIs, ETFs, and units.

The product value is trust. Users should be able to rebuild their full history inside Tax Report, inspect how each
month reached its result, repair missing facts, and close months without relying on spreadsheets or external tax
tools.

## Goals

- Let users review and close their full imported history with a clear result for each supported month.
- Make monthly results understandable enough that users can verify them without leaving the product.
- Reduce reliance on spreadsheets or external tax products for regular cash-market operations.
- Ensure blocked months fail visibly and guide the user to the exact missing facts needed to continue.
- Establish monthly tax close as a core product workflow rather than a side feature.

## User Stories

Primary persona: Brazilian retail investor with an imported history of trades.

- As an investor, I want to see every imported month in one place so I know what still needs review.
- As an investor, I want each month to show whether it is closed, blocked, obsolete, needs review, or is below BRL
  10.00 so I can prioritize my work.
- As an investor, I want to open a month and understand the result by `Geral - Comum`, `Geral - Isento`, and `FII` so
  I can trust the result.
- As an investor, I want to add missing facts when the system cannot finish a month so I can unblock the calculation
  myself.
- As an investor, I want recalculation after corrections so the monthly history stays current.

Secondary persona: investor catching up on older months.

- As a user rebuilding past months, I want to work through the full imported history rather than only the latest
  month.
- As a user with incomplete data, I want the product to tell me exactly what is missing before it asks me to trust a
  result.
- As a user with low payable months, I want the product to show that the amount rolls forward so I understand why a
  later month changed.

## Core Features

- Monthly History Workspace: a month-by-month view covering the user’s imported history, with explicit states such as
  closed, blocked, obsolete, needs review, and below BRL 10.00.
- Month Outcome Summary: each supported month ends in a clear user-facing outcome such as no tax, exempt, tax due, or
  below BRL 10.00 with carry-forward behavior.
- Fixed Monthly Tax Groups: month summaries and details are organized into `Geral - Comum`, `Geral - Isento`, and
  `FII`.
- Audit Trail: each month shows the facts behind the outcome, including grouped sales totals, realized gains or losses,
  exemption analysis, carried losses, IRRF effect, applicable rates, and final amount.
- Missing Facts Repair: when a month cannot be closed confidently, the product identifies missing or conflicting facts
  and lets the user supply the required information before recalculating.
- Full-History Recalculation: users can recalculate after imports, corrections, or classification changes and see
  which months need renewed review.
- Confidence and Policy Disclosure: the product surfaces when a result depends on user-entered facts or a conservative
  rule interpretation.
- Supported Asset Scope for V1: regular cash-market monthly close for stocks, FIIs, ETFs, and units.

## User Experience

The user opens a dedicated Monthly Tax area and sees the imported history organized by month. The product highlights
blocked, unresolved, obsolete, and below-threshold months clearly so the user can triage quickly.

Opening a month shows the top-level result before deeper detail. The detail view is organized around `Geral - Comum`,
`Geral - Isento`, and `FII`, showing the due values under the applicable rate and the facts that produced them. If the
payable value is below BRL 10.00, the month shows that state explicitly and explains that the amount rolls into
subsequent months.

If the month is blocked, the product explains why and presents the manual actions needed to continue. The experience
should favor progressive disclosure: simple summary first, trust-critical detail on demand, and plain-language warnings
when the user must intervene.

## High-Level Technical Constraints

- The feature must stay aligned with Brazilian tax rules for the supported operations and asset categories in scope.
- Results must stay explainable from the user’s recorded history and any manually supplied facts.
- The product must support historical review across the full imported history, not only forward-looking monthly use.
- Unsupported operations or ambiguous cases must be surfaced clearly rather than silently blended into a final result.
- The experience must preserve user trust when history changes, imports are corrected, or classification inputs are
  updated.
- Months below the collection threshold must remain visible in history and roll forward into subsequent months.

## Non-Goals

- Day trade handling.
- Options, short selling, subscriptions, futures, and other unsupported regimes.
- Automated DARF generation, payment tracking, or banking integration in V1.
- Direct user override of the final tax result.
- Full annual declaration automation as part of this feature.
- Broad tax-rule customization for end users.
- Reminder or notification workflow outside the month-close experience.

## Phased Rollout Plan

### MVP (Phase 1)

- Monthly history workspace.
- Supported month close for regular cash-market operations in stocks, FIIs, ETFs, and units.
- Explicit month states, including below BRL 10.00.
- Fixed monthly tax groups for `Geral - Comum`, `Geral - Isento`, and `FII`.
- Month-level audit trail.
- Missing-facts repair and recalculation.

Success criteria to proceed to Phase 2:

- Users can close most supported months from their imported history.
- Users can understand why a month is closed, blocked, or rolled forward without resorting to spreadsheets.

### Phase 2

- Better prioritization for long histories.
- More guided review flows for unresolved months.
- Stronger disclosure around assumptions and confidence.
- Expanded support for additional user-supplied facts if real usage shows that the initial repair flows are
  insufficient.

Success criteria to proceed to Phase 3:

- Users clear historical backlogs faster and abandon fewer unresolved months.

### Phase 3

- Broader tax coverage and obligation follow-through.
- Deeper annual reporting integration.
- Enhanced historical controls and post-close workflows.

Long-term success criteria:

- Monthly close becomes a recurring in-product habit and a trusted source of record.

## Success Metrics

- Adoption: at least 40% of active users with sell activity open the monthly tax area within 60 days of having a
  closeable month.
- Coverage: at least 95% of supported months end with a visible final, blocked, or below-threshold state rather than
  an ambiguous one.
- Audit completeness: at least 85% of calculated months show a complete explanation of result drivers.
- Trust: fewer than 3% of reviewed months are flagged by users as materially inconsistent with their own records after
  review.
- Efficiency: median review time under 2 minutes for an already imported, fully supported month.

## Risks and Mitigations

- Trust risk: users will reject the feature if they see a number they cannot verify.
  Mitigation: make explanation, missing facts, and confidence disclosures first-class parts of the experience.
- Scope creep risk: pressure to add payment workflow, broader asset coverage, or direct overrides may dilute the MVP.
  Mitigation: keep V1 focused on supported monthly close with explanation and repair.
- Backlog fatigue risk: full-history users may feel overwhelmed by many unresolved months.
  Mitigation: prioritize state-based triage and highlight the next months that need action.
- Policy interpretation risk: some asset treatments may be perceived as unclear or conservative.
  Mitigation: disclose the policy used in plain language and surface months affected by it.
- Presentation rigidity risk: the fixed three-group model may need expansion later.
  Mitigation: keep the grouping model explicit as a V1 scope choice.

## Architecture Decision Records

- [ADR-001: Define V1 Scope for Monthly Tax Calculation](adrs/adr-001.md) — Sets the supported monthly tax scope and
  trust-first product boundary for V1.
- [ADR-002: Choose an Audit-First History Workspace for Monthly Tax Close](adrs/adr-002.md) — Makes full-history
  review and month-level auditability the primary user journey.
- [ADR-003: Use Fixed Monthly Tax Groups and Preserve Below-Minimum Roll-Forward](adrs/adr-003.md) — Defines the
  user-facing monthly grouping model and the explicit below-threshold carry-forward state.

## Open Questions

- Which additional manual fact types, if any, should be included in the first release beyond missing costs, IRRF, and
  classification-related inputs?
