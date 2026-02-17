---
name: frontend-development
description: Enforce modern, maintainable Vue 3 + PrimeVue frontend standards for this repository. Use when requests involve Vue pages/components, PrimeVue wrappers, Pinia state, composables, client-side routing, browser rendering behavior, accessibility, performance tuning, or frontend refactoring. Do not use for backend-only work, infrastructure or DevOps tasks, database design, pure algorithm problems, or non-UI scripting.
---

# Vue + PrimeVue Development Guardrails

Apply this workflow for all frontend implementation and refactor tasks.

## 1) Confirm Scope

- Classify the request as frontend or non-frontend before making changes.
- Continue only if the task touches UI, state, client-side data flow, routing, rendering, accessibility, or browser performance.
- Stop and explain why this skill is not applicable when the task is backend-only or outside frontend concerns.

## 2) Align With Repository Conventions

- Read project instructions and existing patterns before coding.
- Reuse existing folder, naming, and component conventions instead of introducing parallel patterns.
- Keep architecture boundaries explicit:
  - `pages/` for routed views
  - `components/` for feature-level reusable parts
  - `ui/` for shared primitives/wrappers
  - `stores/` for Pinia state
  - `services/` for API access
  - `composables/` for shared behavior
- Keep changes incremental and locally consistent with nearby code.

## 3) Enforce Clean Frontend Architecture

- Separate presentation from behavior:
  - Keep templates focused on rendering.
  - Move side effects and orchestration to composables, stores, and services.
  - Keep state ownership explicit with a single source of truth.
- Keep API calls in service modules, not scattered in view components.
- Extract shared logic into reusable units when duplication appears twice.

## 4) Require Type Safety

- Keep TypeScript types explicit and strict.
- Avoid `any`, unsafe casts, and shape assumptions from remote data.
- Map transport DTOs to UI models instead of binding raw responses directly to view state.

## 5) Make Async States Explicit

- Implement `loading`, `error`, `empty`, and `success` states for data-driven views.
- Keep user-facing errors actionable and recoverable (retry or fallback path).
- Avoid UI flicker caused by redundant fetches or conflicting initial state hydration.

## 6) Enforce Accessibility Baseline

- Use semantic elements and preserve heading hierarchy.
- Keep all interactive controls keyboard accessible with visible focus.
- Provide accessible names for icon-only controls and non-text UI affordances.
- Ensure wrapper components pass through accessibility attributes to PrimeVue controls.
- Avoid relying on color alone to communicate status.

## 7) Improve Performance When Justified

- Profile or reason about the bottleneck before optimizing.
- Prevent avoidable recomputation and re-render churn by stabilizing reactive sources and derived computed state.
- Defer non-critical work and split heavy views where it improves first render.
- Avoid speculative micro-optimizations without measurable impact.

## 8) Block Frontend Anti-Patterns

- Break up god components with mixed rendering, domain logic, and side effects.
- Remove duplicated state and keep ownership in one layer.
- Replace ad-hoc API calls spread across components with service abstractions.
- Replace deep watchers with targeted reactive dependencies when possible.
- Prefer composition over copy-pasted PrimeVue variants.

## 9) Refactor Safely

- Preserve behavior first, then improve structure.
- Refactor in small verifiable steps (extract, isolate, simplify, then clean up).
- Keep public component contracts stable unless a change is explicitly requested.

## 10) Report Quality Checks

- Summarize architectural decisions and trade-offs.
- State what was validated (tests, typecheck, lint, or manual verification) and what was not run.
- Call out remaining risks and follow-up actions when constraints block full validation.

## Vue + PrimeVue Notes

- Read `references/vue-primevue-guardrails.md` for Vue Composition API and PrimeVue-specific implementation and refactor guidance.
