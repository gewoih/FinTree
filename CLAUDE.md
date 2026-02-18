# CLAUDE.md

Global AI agent contract for this repository.

References:
- `DESIGN.md` — authoritative frontend/UI-UX specification and frontend Definition of Done
- `TODO.md` — stabilization backlog and known technical debt

---

## Project Context

- Backend: .NET (Clean Architecture/DDD)
- Frontend: Vue 3 + TypeScript + PrimeVue (unstyled)
- Target audience: users with low financial literacy
- Product UX baseline: clarity and predictability over cleverness

---

## Source-of-Truth Contract

- This file owns global project context and repository-wide agent guardrails.
- `DESIGN.md` owns frontend rules for `vue-app/**`, including:
  - UI/UX behavior
  - design system and styling constraints
  - accessibility and responsive requirements
  - localization UX rules
  - frontend completion gates
- If a frontend rule in this file conflicts with `DESIGN.md`, `DESIGN.md` takes precedence.

---

## Global Guardrails

- Keep changes scoped to the task. Avoid opportunistic refactors outside scope.
- Do not introduce silent technical debt. If debt is unavoidable, add a concise item to `TODO.md` in the same task.
- Do not claim completion without running required verification commands for the touched scope.
- For any work under `vue-app/**`, use the canonical frontend checklist in `DESIGN.md` instead of duplicating command lists.

---

## Completion Policy

- A task is complete only when all required checks for its scope pass.
- Frontend checks are defined once in `DESIGN.md` and must not be duplicated in other instruction files.
