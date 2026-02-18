# DESIGN.md

Practical design contract for FinTree.
Goal: consistent, predictable UI without regressions when edited by humans or AI agents.

---

## 1) Source of Truth and Ownership

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

Rule:
- If a style is needed in 2+ places, it must not live in a feature component.

---

## 2) Tokens and Variables

Required:
- Use only `--ft-*` variables for colors, spacing, radius, shadows, fonts, transitions.
- Add new visual values to tokens first.

Forbidden in feature layer:
- raw hex/rgb/hsl values (except temporary debugging)
- arbitrary fallback colors like `var(--token, #xxxxxx)`
- fallbacks to non-existing tokens

Allowed exceptions:
- token files and centralized theme/Prime style layers.

---

## 3) Theming

- Dark theme is default (`:root`).
- Light theme is applied through `.light-mode` on `<html>`.
- Theme class is applied before app mount.

Rule:
- Do not use `.dark-mode`/`.light-mode` selectors in `pages/`, feature `components/`, or `ui/` wrappers.
- Theme behavior should come from semantic tokens.

---

## 4) PrimeVue (Unstyled) Contract

- All visual PrimeVue components are consumed via `vue-app/src/ui/*` wrappers only.
- PrimeVue runtime config lives in `vue-app/src/main.ts`.
- Unstyled feature flags live in `vue-app/src/config/primevue-unstyled-flags.ts`.

### Wrapper Rules

- Wrappers own `pt` classes and public visual state API.
- Visual states (`hover`, `focus`, `disabled`, `invalid`, `active`) are centralized, not redefined ad hoc in feature files.

### `:deep(.p-...)` Rules

Allowed:
- In wrappers, for internal Prime nodes.
- In feature files, only for local layout constraints.

Forbidden:
- Visual theming of Prime internals from feature files (color/background/border/hover/focus/overlay styling).

---

## 5) Forms and Error States

- All fields must expose one consistent visual error state through wrapper contracts.
- Do not rely on ad hoc local `p-invalid` styling hacks.
- Label, hint, error, and focus behavior must be visually consistent across screens.

---

## 6) UI Patterns

### Typography
- UI: Inter
- Amount/code: JetBrains Mono
- Sizes/weights must come from tokens

### Surfaces
- Cards and panels use semantic surface/border/shadow tokens.
- Avoid random mixing of glass/gradient treatments across adjacent sections.

### Motion
- Use `--ft-transition-*`.
- Keep animations short and functional.

### Charts
- Use palette from `useChartColors` and tokens.
- Do not use local random hex color arrays in feature components.

---

## 7) Responsive and Accessibility

- Mobile-first (minimum width: 360px).
- Minimum touch target: 44x44.
- Visible `:focus-visible` is mandatory.
- Do not communicate meaning with color alone.

---

## 8) Content and Localization

- End-user app UI must be Russian.
- Financial terms must include clear hints/tooltips in simple Russian.
- Date/number/currency formatting: `ru-RU`.

Meta rule:
- Agent-facing docs and technical instructions are written in English.

---

## 9) UI Task Definition of Done

Before completion:

```bash
cd vue-app && npm run type-check
cd vue-app && npm run lint
cd vue-app && npm run lint:style
cd vue-app && npm run lint:prime-imports
cd vue-app && npm run build
```

And additionally:
- No new visual Prime internals rules in feature files.
- No new hardcoded colors in feature layer.
- No RU/EN mixing in end-user UI copy.
