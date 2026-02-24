# PrimeVue Styled Migration (Staged Hybrid, Token-Driven)

## Summary
Decision: **Yes, you can switch back to styled PrimeVue**, but **not** as a simple toggle.  
The current codebase is deeply coupled to unstyled wrappers/PT, so the safe path is a staged migration with token-based themed styled mode.

Key evidence:
- Global PrimeVue is unstyled in [main.ts](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/main.ts).
- Most wrappers force unstyled at component level in [src/ui](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui).
- UI wrapper surface is large: 21 wrappers, ~3,632 LOC, 113 PT class mappings.
- Design contract currently mandates unstyled in [DESIGN.md](/Users/nranenko/Desktop/Projects/FinTree/DESIGN.md).
- Existing tokens are mature and reusable in [design-tokens.css](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/assets/design-tokens.css).
- Styled preset package is not yet installed (`@primeuix/themes`).

## Target Architecture
- PrimeVue runs in **styled mode** with a **custom FinTree preset bridge** mapped to existing `--ft-*` tokens.
- `design-tokens.css` remains untouched.
- Wrappers are reduced to UX-important contracts only.
- Excess wrappers are removed progressively.
- PT usage is kept only where strictly needed for stable hooks.

## Wrapper Strategy
Keep (core UX/API contracts):
- `UiButton`, `UiInputText`, `UiInputNumber`, `UiSelect`, `UiDatePicker`
- `UiDialog`, `UiDrawer`, `UiMenu`
- `UiToastHost`, `UiConfirmDialogHost`
- `UiCard`, `UiSection`

Remove or phase out (excessive/thin):
- `UiDataTable` (currently unused)
- `UiChart`, `UiSkeleton`, `UiBadge`, `UiMessage`
- `UiCheckbox`, `UiToggleSwitch`, `UiSelectButton`, `UiPaginator`

## Implementation Plan

### Phase 1: Align Contracts and Baseline
- Update frontend docs/contracts from unstyled-first to styled-hybrid in [DESIGN.md](/Users/nranenko/Desktop/Projects/FinTree/DESIGN.md) and [CLAUDE.md](/Users/nranenko/Desktop/Projects/FinTree/CLAUDE.md).
- Fix contract drift referencing missing `prime-unstyled-shared.css`.
- Record baseline component inventory and wrapper metrics.

Exit criteria:
- Docs and lint expectations match the planned styled direction.

### Phase 2: Introduce Styled Theme Foundation
- Add dependency: `@primeuix/themes` (base preset, e.g. Aura).
- Add `src/theme/fintree-prime-preset.ts` that maps Prime tokens to existing `var(--ft-*)`.
- Configure PrimeVue theme in [main.ts](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/main.ts):
  - `unstyled: false`
  - `theme.preset = FinTree preset`
  - `theme.options.darkModeSelector = '.dark-mode'`
  - `theme.options.cssLayer = { name: 'primevue', order: 'reset, tokens, base, components, primevue, overrides' }`
- Keep `zIndex` and locale behavior unchanged.

Exit criteria:
- Styled primitives render correctly in both dark/light themes while using existing tokens.

### Phase 3: Wrapper Behavior Switch (No Visual Rewrite Yet)
- Remove wrapper hard-default unstyled behavior (`?? true` / hardcoded `true`) so wrappers inherit global styled mode.
- Keep wrapper APIs stable during this phase.
- Keep only minimal PT needed for compatibility hooks.

Exit criteria:
- App runs styled through wrappers without breaking current pages.

### Phase 4: Remove Excess Wrappers + Simplify CSS
- Remove low-value wrappers first (`UiDataTable`, `UiChart`, `UiSkeleton`, `UiBadge`, `UiMessage`).
- Replace imports/usages with direct PrimeVue components where wrapper added no UX value.
- Collapse PT-heavy maps in retained wrappers (especially [UiDatePicker.vue](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui/UiDatePicker.vue) and [UiSelect.vue](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui/UiSelect.vue)).
- Refactor feature CSS that depends on wrapper internals (e.g. [transaction-form.css](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/styles/components/transaction-form.css)) to stable selectors.

Exit criteria:
- Wrapper count and PT complexity materially reduced, visuals remain consistent.

### Phase 5: Final Hardening
- Resolve inconsistencies uncovered during migration (notably `UiButton` variant usage vs implementation).
- Run full frontend gates from [DESIGN.md](/Users/nranenko/Desktop/Projects/FinTree/DESIGN.md).
- Manual verification for critical flows (forms, dialogs, toasts, menus, filters).

Exit criteria:
- All required checks pass and UX parity is preserved.

## Public API / Interface Changes
- PrimeVue runtime config changes in [main.ts](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/main.ts): move from unstyled to styled with theme preset.
- New theme bridge module: `src/theme/fintree-prime-preset.ts`.
- Wrapper internal contract change: default `unstyled` behavior removed from wrappers.
- Wrapper removals for excessive components listed above (with import migrations at call sites).
- No changes to `design-tokens.css` token values.

## Test Cases and Scenarios
- Theme mode correctness: `.dark-mode` and `.light-mode` produce correct component styling.
- Form controls: normal, hover, focus-visible, disabled, invalid/error states.
- Overlay stack: dialog/drawer/menu/toast/confirm z-index interactions.
- Responsive: no horizontal overflow at 360px, 768px, 1280px+.
- Accessibility: keyboard navigation and visible focus intact after wrapper simplification.
- Regression checks on key pages: Accounts, Expenses/TransactionForm, Analytics filters/charts, Profile forms.

## Assumptions and Defaults
- Migration mode: **Staged Hybrid**.
- Visual goal: consistent FinTree visuals, simplified CSS, no token edits.
- Dependency policy: adding `@primeuix/themes` is allowed.
- Wrapper policy: remove excessive wrappers, keep wrappers that protect UX/API consistency.
- `design-tokens.css` remains unchanged as source of truth.
