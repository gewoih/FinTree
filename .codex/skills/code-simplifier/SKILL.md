---
name: code-simplifier
description: Simplify and refine code for clarity, consistency, and maintainability while preserving exact functionality. Use after code is added or modified, and whenever quality issues are detected during implementation or review. Prioritize recently touched files unless the user explicitly asks for broader scope.
---

# Code Simplifier

Refine code structure and readability without changing runtime behavior.

## Core Contract

- Preserve exact behavior, outputs, side effects, and interfaces unless the user explicitly asks for behavioral changes.
- Prefer explicit, readable code over compressed or clever constructs.
- Optimize for maintainability, debuggability, and consistency with repository conventions.

## Scope Rules

- Default scope is recently modified code in the current session.
- Expand scope only when the user explicitly requests wider cleanup.
- Prioritize files in current diffs before touching adjacent areas.
- Keep a continuous quality mindset: if a clear simplification opportunity is found in touched code, handle it now when safe.

## Standards Alignment

- Read and apply project standards from repository guidance files (for this repo: `CLAUDE.md`, `DESIGN.md`, and related instructions).
- Follow existing architecture and framework patterns in the current codebase.
- Apply language/framework standards only when they match the repository stack.
  - Example: do not enforce React component patterns in a Vue-only codebase.
- Keep naming, file organization, and style patterns consistent with nearby code.

## Simplification Principles

- Reduce unnecessary nesting and branching.
- Remove redundant abstractions and dead intermediate variables.
- Consolidate closely related logic when cohesion improves.
- Keep helpful abstractions; do not flatten code that becomes harder to evolve.
- Remove comments that state the obvious; keep comments that explain intent or non-trivial tradeoffs.
- Avoid nested ternaries; use `if/else` chains or explicit condition mapping for multi-branch logic.
- Prefer clear multi-line logic over dense one-liners.

## Anti-Patterns to Remove

- God components or functions mixing presentation, orchestration, and data access.
- Duplicated state with unclear source of truth.
- Scattered service/API logic across UI layers.
- Indirect wrappers that add no domain value.
- Ambiguous names that hide intent.

## Safe Refinement Workflow

1. Identify touched files and edited regions first.
2. Classify simplification candidates by risk:
   - low risk: naming, extraction, obvious duplication removal
   - medium risk: control-flow reshaping, state ownership cleanup
   - high risk: boundary/interface changes (skip unless requested)
3. Apply safe low/medium-risk simplifications immediately in touched code.
4. For unresolved or out-of-scope quality issues, add a concrete TODO entry instead of silently skipping.
5. Re-run available verification (tests, lint, typecheck, or targeted manual checks).
6. Keep or revert each change based on clarity gain and confidence.

## TODO Escalation Rules

- If simplification is not safe in the current task, add an action item to `TODO.md`.
- Write TODOs as concrete, actionable tasks:
  - what to simplify
  - why it matters (readability, maintainability, architecture)
  - where it lives (file/path or feature area)
- Choose priority by impact:
  - `P1` for issues that materially degrade reliability, architecture, or delivery speed
  - `P2` for quality debt and polish that can be scheduled
- Never log vague TODO items like "refactor code"; describe the specific simplification target.

## Verification and Reporting

- Confirm what validation was executed and what could not be run.
- Report only meaningful structural changes that affect understanding.
- Call out residual risks if verification coverage is limited.

## Autonomous Usage

- When this skill is invoked, apply simplification proactively to newly modified code without waiting for extra prompts.
- When quality issues are detected, use a strict outcome:
  - simplify now if safe and in scope
  - otherwise add a TODO entry with clear scope and priority
- Pause and ask only when a cleanup requires changing behavior, contracts, or scope boundaries.

## Reference

- Read `references/simplification-checklist.md` before finalizing a cleanup pass.
