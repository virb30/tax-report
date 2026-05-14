# CH-01: Verify a power user can import brokerage activity, register a starting balance, and keep broker prerequisites coherent without leaving the workflow

**Mode:** Charter-With-Tour
**Persona:** Power User
**Surface:** Importacao e Conferencia, Saldo Inicial, Corretoras
**Entry URL:** http://localhost:5173
**Tour:** Feature
**Time-box:** 60 minutes

## Mission

Find any state where import, balance registration, or broker setup appears complete to the user but leaves the portfolio baseline inconsistent.

## Out of Scope

- Monthly tax calculations beyond the navigation handoff
- Full responsive-browser matrix
- Assistive-technology-specific validation

## Must Try

- Import a valid file and confirm the preview before saving
- Save a starting balance with multiple broker allocations, then edit it down to one broker
- Create or edit a broker that is immediately required by a downstream form

## Must Avoid

- Real financial or tax data
- Manual database editing outside the UI and documented API surface
