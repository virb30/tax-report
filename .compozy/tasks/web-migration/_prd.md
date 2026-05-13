# Web Migration

## Overview

Tax Report will move from a standalone desktop implementation to a web product. The migration exists primarily to
simplify maintenance, testing, and distribution while preserving the product's central value: helping Brazilian
individual investors manage variable income tax workflows with confidence.

The first web release will replace the desktop distribution target after it reaches functional parity across the core
workflows: import, initial balance, positions, monthly tax, annual report, assets, and brokers.

The migration should not attempt to preserve the desktop experience exactly. File import and navigation may change to
fit browser expectations, as long as users can complete the same core tasks and trust the same fiscal outcomes.

## Goals

- Replace platform-specific desktop distribution with browser-based access.
- Preserve functional continuity for all core product workflows in the first web release.
- Reduce maintenance overhead caused by desktop packaging, installation support, and runtime-specific behavior.
- Reduce test complexity by validating product behavior through web-first user flows.
- End desktop distribution work once the web product covers the core workflows.
- Support all modern browsers at launch.

## User Stories

Primary persona: Brazilian individual investor using Tax Report.

- As an investor, I want to access Tax Report from a browser so that I can start without downloading or installing a
  desktop application.
- As an investor, I want to import my investment data in the web product so that I can build my tax history directly
  there.
- As an investor, I want the web product to support import, initial balance, positions, monthly tax, annual report,
  assets, and brokers so that I can complete my tax workflow in one place.
- As an investor, I want browser-native import and clear review steps so that I can trust the data before it affects my
  reports.

Internal persona: product maintainer.

- As a maintainer, I want one primary distribution target so that releases, support, and verification are simpler.
- As a maintainer, I want web-first test coverage for core workflows so that quality checks focus on user behavior
  instead of desktop runtime mechanics.
- As a maintainer, I want to stop investing in desktop distribution so that maintenance effort goes into the web
  product.

## Core Features

- Browser-Based Access: users can open Tax Report from a web address and use the product without installing a
  standalone desktop package.
- Core Workflow Parity: the web release supports import, initial balance, positions, monthly tax, annual report,
  assets, and brokers before replacing desktop distribution.
- Full Path Equivalence: each core workflow must work end to end with the same user outcome currently expected from the
  desktop application.
- Browser-Native Import Experience: importing files follows browser expectations while preserving the user's ability to
  review and confirm imported data.
- Web Navigation Model: the web product may reorganize navigation to make core workflows easier to find and complete in
  the browser.
- New Product Baseline: the web version becomes the primary product surface without carrying legacy desktop data
  constraints.
- Desktop Distribution Shutdown: once web parity is achieved, distribution focuses on the web product.

## User Experience

A user reaches Tax Report through a browser and follows the complete tax workflow: import data, set initial balances
when needed, review positions, inspect monthly tax results, generate annual reporting support, and manage assets and
brokers.

The import flow may change because browser file selection and upload patterns differ from desktop file access. The
experience should make those changes feel natural: clear file selection, preview, validation, confirmation, and recovery
from errors.

Navigation may also change. The web product should prioritize task clarity over preserving the desktop tab structure.
Users should understand where to import data, review portfolio status, close monthly tax obligations, and generate
annual report outputs without learning desktop-specific concepts.

## High-Level Technical Constraints

- The product must be usable in all modern browsers without requiring a desktop installer.
- The first web release must preserve the fiscal reliability and explainability expected from the current core
  workflows.
- File import must work within browser security and file-access expectations.
- The product must protect sensitive financial and tax data with clear privacy and security expectations.
- The product should avoid user-facing dependency on platform-specific installation, local rebuilds, or desktop runtime
  behavior.

## Non-Goals (Out of Scope)

- Automatic migration of local desktop data.
- Long-term parallel maintenance of desktop and web products.
- Exact visual or navigational replication of the desktop application.
- Mobile-native app distribution.
- New tax capabilities beyond what is needed to preserve the current core workflows.
- Collaboration features for accountants, advisors, or multi-user workspaces.
- Offline-first operation in the first release.

## Phased Rollout Plan

### MVP (Phase 1)

- Browser access across modern browsers.
- Functional parity for import, initial balance, positions, monthly tax, annual report, assets, and brokers.
- Full feature paths working with equivalent outcomes to the desktop application.
- Browser-native file import with preview and confirmation.
- Web navigation adapted for the complete tax workflow.
- Internal verification focused on the complete web workflow.

Success criteria to proceed to Phase 2:

- A user can complete every full supported Tax Report feature path in the browser.
- The web product can replace desktop distribution.
- No core workflow depends on desktop installation.

### Phase 2

- Remove desktop distribution from the active product path.
- Route onboarding and support material to the web product.
- Refine navigation and import usability based on first web usage.
- Reduce or archive desktop-specific release and support processes.

Success criteria to proceed to Phase 3:

- Users can start and complete core workflows on web without desktop support.
- Support and development work no longer depend on desktop packaging.
- Web workflow completion is stable across all modern browsers.

### Phase 3

- Continue simplifying product operations around a single primary web surface.
- Evaluate future product expansion separately from this migration.

Long-term success criteria:

- Tax Report is maintained, tested, and distributed as a web product, with desktop no longer treated as a current
  distribution channel.

## Success Metrics

- Distribution: 100% of product access is directed to the web product after Phase 1 acceptance.
- Workflow parity: all seven core workflows are available in the web product before desktop distribution ends.
- Path completeness: every full feature path that works in the desktop application has an equivalent working web path.
- Browser support: the complete workflow passes acceptance validation in all supported modern browsers.
- Release efficiency: routine product releases no longer require platform-specific desktop packaging.
- Test efficiency: core workflow verification runs through web-first user flows without requiring desktop runtime setup.
- Adoption: at least 80% of users who start setup in the web product complete their first import or initial data entry
  flow.

## Risks and Mitigations

- Risk: covering every core workflow in Phase 1 increases release size.
  Mitigation: keep Phase 1 limited to parity, browser access, import adaptation, navigation, and operational
  simplification.
- Risk: users may perceive the web version as incomplete if navigation changes obscure existing capabilities.
  Mitigation: validate workflows by task completion and retain familiar domain language even if layout changes.
- Risk: sensitive tax data may make users hesitant to use a web product.
  Mitigation: make privacy, security, and data handling expectations explicit in onboarding and support material.
- Risk: ending desktop distribution before parity could create avoidable rework.
  Mitigation: end desktop distribution only after all defined core workflows are available in web.
- Risk: modern browser differences may create inconsistent user outcomes.
  Mitigation: require full workflow acceptance validation across the supported browser set before replacing desktop
  distribution.

## Architecture Decision Records

- [ADR-001: Replace Desktop Distribution with a Web Product](adrs/adr-001.md) — Selects a web replacement with core
  workflow parity and no Phase 1 desktop data migration.

## Open Questions

None.
