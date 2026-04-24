# Ship-Learn-Next Plan: Prevent God Modules

## Quest Overview

**Goal**: Prevent future implementations from recreating pages, hooks, entities, parsers, or IPC controllers with mixed responsibilities.
**Source**: `docs/_refacs/20260424-refactor-lessons-learned.md`
**Core Lessons**:

- Name the responsibility that already exists before inventing broader abstractions.
- Keep React pages as composition roots, with workflows in hooks and UI in focused components.
- Extract domain classes only for cohesive sub-rules with their own data and operations.
- Treat technical boundaries like IPC as shared contracts, not repeated strings and validation logic.
- Add focused tests for each extracted responsibility or boundary contract.

## Rep 1: Codify the Rules

**Ship Goal**: Add project-level implementation rules to `AGENTS.md`.
**Timeline**: 2026-04-24
**Success Criteria**:

- [x] Rules cover React pages and page hooks.
- [x] Rules cover domain entity extraction.
- [x] Rules cover parser phase naming.
- [x] Rules cover IPC and other technical boundaries.
- [x] Rules require focused tests for extracted responsibilities.

**What This Practices**:

- Turning lessons learned into executable project guidance.
- Preventing the same design error before implementation starts.

**Action Steps**:

1. Read the refactor lessons.
2. Extract the recurring implementation failure mode.
3. Add concrete rules to `AGENTS.md`.
4. Review the diff for conflicts with existing repository guidance.

**After Shipping - Reflection**:

- What implementations still need more specific guardrails?
- Did the new rules help catch mixed responsibilities before code was written?
- Which rule was easiest to follow?
- Which rule was ignored or ambiguous?
- What should be tightened next?

## Rep 2: Apply the Rules During the Next Feature

**Builds on**: Rep 1 and the new `AGENTS.md` rules.
**New Element**: Use the rules as a pre-implementation checklist.
**Ship Goal**: For the next behavior change, explicitly identify the responsibility being changed before editing code.
**Expected Difficulty**: Same; the cost is small, but it requires discipline before implementation.

## Rep 3: Add Review Checks

**Builds on**: Rep 2 observations.
**New Element**: During review, flag any page, hook, entity, parser, or IPC controller that mixes orchestration, state, validation, transport, and presentation.
**Ship Goal**: Add review feedback or a follow-up refactor note when a new mixed-responsibility module appears.

## Rep 4: Strengthen Tests Around Extracted Responsibilities

**Builds on**: Reps 2-3.
**New Element**: Require focused tests for extracted modules instead of relying only on broad flow tests.
**Ship Goal**: Add or update at least one colocated test whenever a responsibility is extracted.

## Rep 5: Reassess the Rules

**Builds on**: Evidence from several changes.
**New Element**: Refine the rules based on real friction.
**Ship Goal**: Update `AGENTS.md` only if a repeated failure mode appears or a rule proves too vague.
