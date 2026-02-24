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
- `vue-app/src/assets/design-tokens.css` — all `--ft-*` tokens. No visual rules.
- `vue-app/src/style.css` — global reset, `html`/`body`, typography base, scrollbar
- `vue-app/src/styles/theme.css` — shared layout patterns only (`.ft-card`, `.ft-section`, `.ft-stat`, etc.). Nothing PrimeVue-related.
- `vue-app/src/ui/Ui*.vue` `<style scoped>` — 100% of that wrapper's visual contract. All `:deep()` for PrimeVue internals. This is the only place PrimeVue wrapper styles live.
- `vue-app/src/styles/components/` — feature components too large for inline scoped styles (non-PrimeVue)
- `vue-app/src/styles/pages/` — page-level layout only

Rules:
- **One component, one file.** A component's styles live only in that component's file.
- When touching `UiButton`, edit `UiButton.vue` only. Never touch a shared file to fix a specific component's appearance.
- Before editing any CSS: identify every file that contains styles for the target component. If more than one file, co-locate first, then make the visual change.
- PrimeVue wrapper styles must never live in `theme.css`, `style.css`, or any shared CSS file.

### CSS Verification Gate

After any CSS change:
1. Run `cd vue-app && npm run lint:style` — must pass with 0 warnings
2. Verify the component in dark mode (default) and light mode (`.light-mode` on `<html>`)
3. Verify at mobile (360px) and desktop (1280px) breakpoints
4. Do not mark a task complete without this verification

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

## 5) PrimeVue (Styled Hybrid) Contract

- All visual PrimeVue components are consumed via `vue-app/src/ui/*` wrappers only.
- PrimeVue runtime config lives in `vue-app/src/main.ts`.
- PrimeVue runs in styled mode with a custom preset bridge that maps to `--ft-*` tokens.
- Wrappers must inherit global PrimeVue styling by default; local `unstyled` overrides are allowed only for targeted testing or compatibility edge cases.

Direct imports outside wrappers are allowed only for:
- `primevue/config`
- `primevue/toastservice`
- `primevue/confirmationservice`
- `primevue/tooltip`
- `primevue/usetoast`
- `primevue/useconfirm`
- `primevue/chart`
- `primevue/checkbox`
- `primevue/message`
- `primevue/paginator`
- `primevue/selectbutton`
- `primevue/skeleton`
- `primevue/tag`
- `primevue/toggleswitch`
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
- Shared invalid-state visuals are owned by field wrappers (`UiInputText`, `UiInputNumber`, `UiSelect`, `UiDatePicker`) and must stay token-driven.
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
