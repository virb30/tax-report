# CH-02: Verify a recovering user can understand a blocked monthly tax state and reach the right repair surface without losing context

**Mode:** Scenario-Based
**Persona:** Recovering User
**Surface:** Imposto Mensal -> Catalogo de Ativos
**Entry URL:** http://localhost:5173
**Tour:** Back-Button
**Time-box:** 60 minutes

## Mission

Find any way a blocked monthly tax message, CTA, or return path can strand the user before the month becomes understandable or repairable.

## Out of Scope

- Full tax arithmetic correctness
- Browser extension compatibility
- Cross-device responsive checks

## Must Try

- Open a blocked month and follow its repair CTA
- Return to the monthly workspace and verify the message/history refresh path
- Retry after a detail-load failure or empty-history state

## Must Avoid

- Non-monthly workflows unless the CTA explicitly redirects there
