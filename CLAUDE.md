# CLAUDE.md

Short operational contract for this repository.

References:
- `DESIGN.md` — visual system and style ownership
- `TODO.md` — current stabilization backlog

---

## Quick Commands

```bash
cd vue-app && npm run type-check
cd vue-app && npm run lint
cd vue-app && npm run lint:style
cd vue-app && npm run lint:prime-imports
cd vue-app && npm run build
```

---

## Stack and Context

- Backend: .NET (Clean Architecture/DDD)
- Frontend: Vue 3 + TypeScript + PrimeVue (unstyled)
- Target audience: users with low financial literacy
- UX baseline: clarity and predictability over cleverness

---

## Mandatory Frontend Contract

### 1) Architecture Boundaries

- `services/` — HTTP/API client only.
- `stores/` and `composables/` — business state, orchestration, async flows.
- `pages/` and feature `components/` — rendering and UI interactions, no direct API orchestration.
- `ui/` — single entry point for visual PrimeVue components.
- Never bind DTOs directly to templates; map to UI models first.

Forbidden:
- Importing `apiService` in `pages/` or feature `components/`.
- Splitting one async flow across multiple layers without clear ownership.

---

### 2) PrimeVue Contract

- PrimeVue is enabled in `unstyled` mode.
- Direct imports of visual PrimeVue components are forbidden outside `src/ui/*`.
- Allowed direct imports outside wrappers:
  - `primevue/config`
  - `primevue/toastservice`
  - `primevue/confirmationservice`
  - `primevue/tooltip`
  - `primevue/usetoast`
  - `primevue/useconfirm`
  - type-only `primevue/menuitem`

Wrapper styling rules:
- Style wrapper roots via wrapper classes.
- Use `:deep(.p-...)` only for internal Prime nodes, not for wrapper roots.
- In feature files, `:deep(.p-...)` is allowed only for local layout constraints, not visual theming.

---

### 3) Styling and Tokens

- Do not hardcode colors/radius/shadows/spacing in feature layer.
- Use `--ft-*` tokens only.
- Do not use `.dark-mode` / `.light-mode` selectors inside feature components.

Ownership by file:
- `src/assets/design-tokens.css` — token source of truth
- `src/style.css` — reset/base/layout helpers
- `src/styles/theme.css` — shared UI patterns
- `src/styles/prime-unstyled-shared.css` — visual Prime wrapper contract
- `src/styles/prime-overrides.css` — minimal legacy/compat layer

---

### 4) Data States (Always Explicit)

Every data-driven screen must have explicit states:
- `loading`
- `error` (with retry)
- `empty`
- `success`

Avoid:
- hidden intermediate states
- side effects in computed values
- duplicate or redundant requests

---

### 5) Validation and Form Errors

- Validation and error messages must be in Russian.
- Field error visuals must go through one wrapper contract, not ad-hoc local hacks.
- Destructive actions require explicit confirmation.

---

### 6) Accessibility Baseline

- All interactive elements are keyboard accessible.
- Visible `:focus-visible` is mandatory.
- Minimum touch target: `44x44`.
- Icon-only actions must have `aria-label`.

---

### 7) Localization Rule

- Agent-facing documentation and instructions: English.
- End-user app interface (labels, errors, hints, tooltips): Russian only.
- Dates/numbers/currency formatting: `ru-RU`.

---

## Quality Gate Before Completion

Before claiming task completion, run and verify:

```bash
cd vue-app && npm run type-check
cd vue-app && npm run lint
cd vue-app && npm run lint:style
cd vue-app && npm run lint:prime-imports
cd vue-app && npm run build
```

If any step fails, the task is not complete.

---

## Anti-Patterns (Block by Default)

- God components without decomposition
- Duplicate local state with unclear source of truth
- Visual Prime internals overrides from feature files
- Mixed RU/EN language in end-user UI
- New tech debt without recording it in `TODO.md`
