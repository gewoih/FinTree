# Vue + PrimeVue Guardrails

Use this file after following the core workflow in `SKILL.md`.

## Component Boundaries

- Keep routed orchestration in `pages/`.
- Keep reusable feature blocks in `components/`.
- Keep shared primitives in `ui/`, especially PrimeVue wrappers.
- Keep data access and HTTP mapping in `services/`.
- Keep shared behavior in `composables/`.
- Keep cross-page state in Pinia stores with clear ownership.

## Vue Composition API

- Keep templates focused on rendering.
- Keep behavior in composables and business rules in services/stores.
- Keep store as source of truth; avoid duplicated reactive state across components.
- Keep watchers purposeful; avoid expensive deep watchers unless unavoidable.
- Prefer `computed` over imperative synchronization when deriving view state.
- Minimize prop drilling by extracting shared logic to composables/store slices.

## PrimeVue Integration

- Use wrapper components in `ui/` to centralize styling and behavior.
- Override PrimeVue root-level classes with wrapper selectors; use `:deep()` only for nested internals.
- Avoid direct PrimeVue usage in feature pages when a wrapper already exists.
- Keep variants explicit in wrapper props and map them predictably to classes.

## Type Safety and Data Flow

- Keep request/response DTOs separate from UI view models.
- Normalize or map remote data before binding to visual components.
- Keep all public composable/store contracts typed.
- Avoid leaking raw `unknown`/`any` objects into templates.

## Async UX States

- Represent `loading`, `error`, `empty`, and `success` explicitly in data-driven pages.
- Prevent flicker from duplicate fetch + rehydrate flows.
- Keep retry actions visible and deterministic.
- Keep error copy short and actionable.

## Accessibility Baseline

- Keep semantic structure and heading order valid on every page.
- Ensure every icon-only action includes `aria-label`.
- Preserve visible focus styles and keyboard flow through custom wrappers.
- Do not encode status by color alone; include text/icon cues.

## Refactor Pattern

1. Identify mixed concerns (view, state, side effects, API calls).
2. Extract service boundary for data access and orchestration.
3. Extract reusable state/logic unit (composable/store slice).
4. Reduce component to presentation plus minimal UI event wiring.
5. Verify behavior parity before and after extraction.
