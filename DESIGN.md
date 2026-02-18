# DESIGN.md

Frontend UI/UX and design specification for FinTree.
Goal: consistent, predictable, accessible frontend behavior without design regressions when edited by humans or AI agents.

---

## 1) Scope and Authority

- This file is authoritative for frontend work in `vue-app/src/**`.
- It owns:
  - UI/UX behavior
  - visual system and styling rules
  - frontend accessibility and responsive requirements
  - localization UX rules
  - frontend Definition of Done
- It does not define backend architecture or backend implementation rules.
- If this file conflicts with `CLAUDE.md` on frontend topics, this file takes precedence.

---

## 2) Source of Truth and Style Ownership

CSS layer order:

```css
@layer reset, tokens, base, components, primevue, overrides;
```

Ownership by file:
- `vue-app/src/assets/design-tokens.css` — all `--ft-*` tokens
- `vue-app/src/style.css` — reset, base typography, layout helpers
- `vue-app/src/styles/theme.css` — shared component patterns
- `vue-app/src/styles/prime-unstyled-shared.css` — Prime wrapper visual contract
- `vue-app/src/styles/prime-overrides.css` — minimal compatibility layer

Rules:
- If a style is needed in 2+ places, it must not live in a feature component.
- New shared visual behavior must be introduced in the owning shared layer, not copied across feature files.

### SFC Style Extraction

- When moving styles out of `.vue` files, place them in:
  - `vue-app/src/styles/pages/` for routed page styles
  - `vue-app/src/styles/components/` for feature/component styles
- Keep component scoping by default via `<style scoped src="...">`.
- Do not convert extracted styles to global/unscoped CSS unless the style is intentionally shared and documented.
- If extracted styles require deep targeting:
  - prefer explicit class hooks on wrapper/component roots, or
  - keep the deep rule inside the original SFC block.

---

## 3) Tokens and Variables

Required:
- Use only `--ft-*` variables for colors, spacing, radius, shadows, fonts, and transitions.
- Add new visual values to tokens before usage in feature styles.

Forbidden in feature layer:
- raw hex/rgb/hsl values
- arbitrary fallback colors like `var(--token, #xxxxxx)`
- fallbacks to non-existing tokens

Allowed exceptions:
- token files and centralized theme/Prime style layers.

Debugging note:
- Temporary raw colors are allowed only in local uncommitted experiments. They must never be committed.

---

## 4) Theming

- Dark theme is default (`:root`).
- Light theme is activated via `.light-mode` on `<html>`.
- Theme class is applied before app mount in `vue-app/src/main.ts`.

Rules:
- Do not use `.dark-mode` or `.light-mode` selectors inside feature `pages/`, feature `components/`, or `ui/` wrappers.
- Theme behavior must come from semantic tokens.

---

## 5) PrimeVue (Unstyled) Contract

- All visual PrimeVue components are consumed via `vue-app/src/ui/*` wrappers only.
- PrimeVue runtime config lives in `vue-app/src/main.ts`.
- Unstyled mode is always on in wrapper contracts; wrappers may still override via local `unstyled` prop for targeted tests.

Direct imports outside wrappers are allowed only for:
- `primevue/config`
- `primevue/toastservice`
- `primevue/confirmationservice`
- `primevue/tooltip`
- `primevue/usetoast`
- `primevue/useconfirm`
- type-only `primevue/menuitem`

Wrapper rules:
- Wrappers own `pt` classes and the public visual state API.
- Visual states (`hover`, `focus`, `disabled`, `invalid`, `active`) are centralized in wrappers/shared layers.

`:deep(.p-...)` rules:
- Allowed in wrappers for internal Prime nodes.
- Allowed in feature files only for local layout constraints.
- Forbidden in feature files for Prime visual theming (color, border, hover, focus, overlays).

---

## 6) Accessibility Standards (Measurable)

Keyboard and focus:
- All interactive controls must be reachable and operable by keyboard.
- No keyboard trap is allowed.
- Visible `:focus-visible` is mandatory.
- Focus indicator contrast against adjacent colors must be at least `3:1`.

Touch and pointer targets:
- Minimum touch target for actionable controls is `44x44` CSS px.

Contrast:
- Text and text-in-images must satisfy WCAG 2.2 AA:
  - normal text: at least `4.5:1`
  - large text (>= 24px regular or >= 18.66px bold): at least `3:1`
- Non-text UI components and focus indicators must be at least `3:1` against adjacent colors.

Semantics and assistive tech:
- Icon-only actions must have an accessible name (`aria-label` or equivalent).
- Form errors must be programmatically associated with fields (for example via `aria-describedby`).
- Validation and async status messages must be announced via `aria-live`:
  - `polite` for non-blocking updates
  - `assertive` for blocking/critical errors
- Meaning must not be conveyed by color alone.

Motion accessibility:
- Respect `prefers-reduced-motion: reduce` by disabling or minimizing non-essential motion.

---

## 7) Responsive Contract

- Supported viewport floor is `360px`.
- Core breakpoints used across the design system are:
  - `640px` (small/mobile transition)
  - `768px` (tablet)
  - `1024px` (desktop)

Rules:
- New/changed layouts must not introduce horizontal page overflow at `360px`, `768px`, and desktop widths (`>=1280px`).
- Dense data UI (tables/charts) must remain usable on mobile via responsive reflow or explicit scroll containers.

---

## 8) Forms and Validation UX

- Field wrappers (`UiInputText`, `UiInputNumber`, `UiSelect`, `UiDatePicker`) must expose `invalid` and optional `error` props as the validation API.
- Feature `pages/` and `components/` must not set `p-invalid` directly.
- Shared invalid-state visuals are defined in `vue-app/src/styles/prime-unstyled-shared.css`.
- Label, hint, error, and focus behavior must be visually consistent across screens.
- Destructive actions require explicit user confirmation.

---

## 9) Data-State UX Contract

Every data-driven screen must explicitly handle:
- `idle` (before first fetch or precondition not met)
- `loading`
- `error` (with retry)
- `empty`
- `success`

Rules:
- Avoid hidden intermediate states.
- Avoid side effects inside computed values.
- Avoid duplicate or redundant requests.
- When revalidating in background, keep last known good data visible unless data is no longer valid.

---

## 10) Content and Localization

Default:
- End-user UI copy is Russian.
- Financial terms should include clear hints/tooltips in plain Russian when needed.
- Date/number/currency formatting uses `ru-RU`.

Scoped English exceptions allowed:
- brand and product names (`PrimeVue`, `Mastercard`)
- financial tickers/codes and currency codes (`AAPL`, `ETF`, `USD`, `EUR`)
- legally mandated terms or third-party proper nouns
- standardized acronyms that are materially clearer in established form (`PIN`, `IBAN`)

Exception rules:
- The surrounding sentence remains Russian.
- On first use of a non-obvious English term, provide a brief Russian hint/tooltip.
- Avoid mixed-language phrasing when a clear Russian equivalent exists.

Meta rule:
- Agent-facing technical documentation is written in English.

---

## 11) Visual and Motion Patterns

Typography:
- UI font: Inter
- Numeric/code contexts: JetBrains Mono
- Sizes and weights must come from tokens

Surfaces:
- Cards and panels use semantic surface/border/shadow tokens.
- Avoid random mixing of glass/gradient treatments across adjacent sections.

Motion:
- Use `--ft-transition-*` tokens.
- Keep animations short and functional.
- Non-essential UI transitions should generally stay in the `120ms` to `300ms` range.

Charts:
- Use palette from `useChartColors` and tokens.
- Do not use local random hex arrays in feature components.

---

## 12) Frontend Definition of Done (Canonical)

Before completion, run:

```bash
cd vue-app && npm run type-check
cd vue-app && npm run lint
cd vue-app && npm run lint:style
cd vue-app && npm run lint:design-contract
cd vue-app && npm run lint:prime-imports
cd vue-app && npm run lint:api-boundaries
cd vue-app && npm run build
```

Additional required checks:
- If CSS/SCSS/Vue styles changed, run `cd vue-app && npm run lint:style:fix` before the final `lint:style`.
- `cd vue-app && npm run lint:style` must pass with zero warnings.
- No new Prime visual theming rules in feature files via `:deep(.p-...)`.
- No new hardcoded colors in feature layer.
- No unintended RU/EN mixing in end-user copy outside allowed exception categories.
- Manual verification for changed UI:
  - no horizontal overflow at `360px`, `768px`, and desktop
  - keyboard navigation and visible focus are intact
  - contrast and reduced-motion expectations are met

Completion rule:
- If any required check fails, the frontend task is not complete.
