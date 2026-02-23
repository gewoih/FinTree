# CSS Co-location Refactor — Design

**Date:** 2026-02-22
**Branch:** feature/21-02
**Status:** Approved

---

## Problem

Visual regressions are consistently caused by AI agents (and humans) editing shared CSS files — primarily `prime-unstyled-shared.css` (1,656 lines) — and silently breaking unrelated components. The root cause is that styles for any given `Ui*.vue` wrapper are split across at minimum three places: the component's own scoped styles, the shared CSS monolith, and `theme.css`. Blast radius per change is unpredictably high.

---

## Decision

**Approach B: CSS co-location refactor.**

Keep PrimeVue `unstyled: true` and the PT pass-through system. Move all PrimeVue wrapper styles out of `prime-unstyled-shared.css` and into each `Ui*.vue` file via `<style scoped>` + `:deep()`. Delete the monolith when complete.

PrimeVue unstyled mode is correct for this design system — the problem is style placement, not the PrimeVue strategy.

---

## CSS Ownership Model

One rule: **a component's styles live only in that component's file.**

| File | Owns |
|---|---|
| `design-tokens.css` | CSS custom properties only — no visual rules ever |
| `style.css` | Global reset, `html`/`body`, typography base, global scrollbar |
| `theme.css` | Shared layout patterns only: `.ft-card`, `.ft-section`, `.ft-stat`, etc. — nothing PrimeVue-related |
| `Ui*.vue` `<style scoped>` | 100% of that wrapper's visual contract — all `:deep()` for PrimeVue internals |
| `styles/components/*.css` | Feature components large enough to warrant extraction (non-PrimeVue) |
| `styles/pages/*.css` | Page-level layout only |
| `prime-unstyled-shared.css` | **Deleted** after migration — contents move into `Ui*.vue` files |

---

## Co-location Pattern

PT continues to inject semantic class names onto PrimeVue DOM elements. All CSS that styles those classes moves into the component's `<style scoped>`.

```vue
<!-- Example: UiButton.vue -->
<script setup lang="ts">
const mergedPt = computed(() => mergePt({
  root: { class: 'ui-button' },
  label: { class: 'ui-button__label' },
  icon: { class: 'ui-button__icon' },
}, props.pt));
</script>

<template>
  <Button v-bind="mergedPt" ... />
</template>

<style scoped>
/* All visual rules here — tokens only, no raw values */
.ui-button { ... }
:deep(.ui-button__label) { ... }
/* Variants, sizes, states — all in one place */
</style>
```

**CSS rules inside scoped blocks:**
- Only `--ft-*` tokens as values — no raw hex, no hardcoded px colors
- No `!important` — use more specific selectors if needed
- `:deep()` for PrimeVue-generated child elements
- Dark/light theming handled by semantic tokens — no manual `.light-mode` checks in component styles

---

## Instruction Improvements

### Addition to DESIGN.md — File Ownership Decision Tree

> **Whose styles are you changing?**
> - A PrimeVue wrapper (`Ui*.vue`) → edit that file's `<style scoped>` only
> - A feature component → edit its `.vue` scoped or its `styles/components/*.css`
> - A shared layout pattern → edit `theme.css` only
> - A token value → edit `design-tokens.css` only
>
> If the component's styles currently live in more than one file, co-locate first, then make the visual change.

### Addition to CLAUDE.md — Blast Radius Rule

> Before editing any CSS, identify every file that contains styles for the component being changed. If that list has more than one file, the first task is co-location — move all styles into the component file before making any visual change.

### Addition to DESIGN.md — CSS Verification Gate

> After any CSS change: verify the component renders correctly in both dark and light mode, at mobile (360px) and desktop (1024px+) breakpoints. Do not mark a CSS task complete without this verification step.

---

## Migration Strategy

Migrate one component at a time in this order (lowest blast radius first):

### Phase 1 — Isolated components (small, few usages)
- `UiTag`
- `UiCheckbox`
- `UiToggleSwitch`
- `UiBadge`

### Phase 2 — Form inputs
- `UiInputText`
- `UiInputNumber`
- `UiSelect`
- `UiDatePicker`
- `UiTextarea`

### Phase 3 — Actions and feedback
- `UiButton`
- `UiToast`
- `UiMenu`
- `UiPaginator`

### Phase 4 — Containers and overlays (highest blast radius)
- `UiCard`
- `UiDialog`
- `UiDrawer`
- `UiDataTable`
- `UiChart`

**Per-component migration steps:**
1. Read current styles in `prime-unstyled-shared.css` for this component
2. Add `<style scoped>` block to the `.vue` file with the migrated styles
3. Delete the corresponding lines from `prime-unstyled-shared.css`
4. Verify: dark + light mode, mobile + desktop breakpoints
5. Move to next component

**Final step:** Once all components are migrated and verified, delete `prime-unstyled-shared.css` and remove its import from wherever it's loaded.

---

## Success Criteria

- `prime-unstyled-shared.css` is deleted
- Every `Ui*.vue` is visually self-contained
- Editing `UiButton.vue` requires touching only `UiButton.vue`
- CLAUDE.md and DESIGN.md contain the ownership decision tree, blast radius rule, and CSS verification gate
- All components verified in dark + light, mobile + desktop
