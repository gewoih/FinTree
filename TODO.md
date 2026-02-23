## Analytics

- [ ] `FT-TODO-024` Avoid repeated per-month projection of allTransactions in GetEvolutionAsync
  **Acceptance criteria:** `allTransactions` is projected into its tuple form once before the monthly loop and reused, instead of being re-projected on every iteration via `.Select(...)` inside `ComputeNetWorthAt`'s call site.

- [ ] `FT-TODO-025` GetEvolutionAsync makes N async calls to CurrencyConverter inside the month loop (one per month). Pre-fetch all needed rates before the loop (similar to GetNetWorthTrendAsync pattern) to reduce to O(1) currency service calls.

- [ ] `FT-TODO-026` ComputeBalanceAt in GetEvolutionAsync duplicates balance reconstruction logic that also exists in GetNetWorthTrendAsync (ApplyBalanceEvent). Consider extracting a shared private helper to eliminate the maintenance risk of formula divergence.

- [ ] `FT-TODO-027` useEvolutionTab monthOverMonthDelta suppresses delta when prev === 0. This guard is correct for percentage change but wrong for absolute delta. Review before shipping Evolution UI — for now delta is informational only.

- [ ] `FT-TODO-028` useEvolutionTab previousMonthValue does not align correctly with currentMonthValue when trailing months have hasData=false (e.g. current in-progress month). Both should be computed from the same filtered+reversed iteration to avoid off-by-one delta.

- [ ] 'FT-TODO-MONEY' explore the opportunity to uncomment throwing exception in Money.ctr() if amount is negative or zero. Is Money should handle negative amounts?

- [ ] `FT-TODO-009` Rebuild category icons considering income/expense context  
  **Acceptance criteria:** two curated icon sets are used (income and expense) with fallback support for legacy values.

- [ ] `FT-TODO-011` Fix non-clickable tooltips in analytics on mobile
  **Acceptance criteria:** tooltips are fully interactive and accessible on mobile devices without gesture conflicts.

- [x] `FT-TODO-015` Unify base expense calculation across forecast and liquidity metrics
  **Acceptance criteria:** a single shared calculation logic is used for baseline expense in both forecast and liquidity features.

---

## Navigation & Layout

- [x] `FT-TODO-012` Hide sidebar menu in mobile layout
  **Acceptance criteria:** sidebar is collapsed by default and accessible via a dedicated mobile navigation trigger.

- [x] `FT-TODO-013` Align top navigation and bottom navigation (mobile) styling with sidebar
  **Acceptance criteria:** gradient is removed and navigation elements share a unified visual system with sidebar tokens.

- [ ] `FT-TODO-019` Fix tablet sidebar drawer styling
  **Acceptance criteria:** the drawer close button is positioned correctly within the header (not floating outside it); drawer header, nav links, user card, and logout button match the design system tokens and spacing used in the desktop sidebar.

- [ ] `FT-TODO-018` Strengthen bottom tab bar visual separation in light mode
  **Acceptance criteria:** bottom tab bar is visually distinct from the page background in light mode without relying solely on `border-top` and `box-shadow` (e.g. via a slightly more distinct `--ft-surface-*` token or a stronger border).

---

## Charts & Visual System

- [x] `FT-TODO-014` Remove chart color overrides (`chartColorGuards.ts`)  
  **Acceptance criteria:** no runtime color guards override chart palette behavior.

- [x] `FT-TODO-016` Set default chart color to base olive token  
  **Acceptance criteria:** charts use base olive color as primary default unless explicitly overridden.

---

## Modals & Interaction Patterns

- [x] `FT-TODO-017` Redesign confirmation modal (`confirm.require`) and extract dedicated component
  **Acceptance criteria:** reusable confirmation component exists with consistent API, styling, and accessibility behavior.

- [ ] `FT-TODO-020` Style PrimeVue Select (dropdown) component to match design system
  **Acceptance criteria:** dropdown panel background uses `--ft-surface-*` tokens; option items have correct hover, selected, and focused states using `--ft-primary-*` tokens; item spacing matches design density; scrollbar is styled consistently; panel border and shadow match other overlay surfaces.

- [ ] `FT-TODO-021` Style PrimeVue DatePicker (calendar) component to match design system
  **Acceptance criteria:** navigation prev/next buttons use design system icon-button styling (no raw gray background); month/year header buttons match surface tokens; day cells have correct hover and selected states using `--ft-primary-*` tokens; "Today" and "Clear" footer buttons use the standard secondary button style; day-of-week labels use `--ft-text-muted`; calendar panel border and shadow match other overlay surfaces.

---

## CSS / Styling Technical Debt

- [ ] `FT-TODO-023` Define visual style for UiBadge `secondary` severity
  **Acceptance criteria:** `severity="secondary"` renders with a distinct background, color, and border using `--ft-*` tokens. Currently has no CSS rule — visually unstyled/inherited.

- [ ] `FT-TODO-022` Fix pre-existing stylelint errors in extracted CSS files
  **Acceptance criteria:** `npm run lint:style` passes with 0 warnings. Currently failing: `src/styles/components/app-shell.css` (3 errors — `:deep` in plain CSS) and `src/styles/components/transaction-list.css` (1 error — `:deep` in plain CSS). Fix by moving `:deep()` rules into the owning `.vue` component's scoped block.

- [ ] `FT-TODO-024` Replace raw `0.95rem` literal in UiButton.vue icon font-size with a `--ft-*` token
  **Acceptance criteria:** `font-size: 0.95rem` in `.ui-button :deep(.ui-button__icon)` uses a `--ft-text-*` token. Add token to `design-tokens.css` if the scale doesn't already cover it.

- [ ] `FT-TODO-027` Fix UiPaginator button touch target below accessibility minimum
  **Acceptance criteria:** Paginator nav/page buttons meet the 44px (`--ft-control-height: 2.75rem`) minimum touch target. Currently set to `height: 2.25rem` (36px) in `UiPaginator.vue`.

- [ ] `FT-TODO-028` Replace `font-size: 1rem` hardcoded value in UiToastHost.vue with `var(--ft-text-base)`
  **Acceptance criteria:** The message icon `font-size` on line ~70 of `UiToastHost.vue` uses `var(--ft-text-base)` instead of `1rem`.

- [ ] `FT-TODO-026` Clarify UiSelect panelClass vs overlayClass redundancy
  **Acceptance criteria:** `UiSelect.vue` applies `ui-select-overlay` to only the prop PrimeVue currently uses (`overlayClass`). Remove the redundant `panelClass` binding or document which prop is canonical for the installed PrimeVue version.

- [ ] `FT-TODO-029` Fix dead `.ui-chart__root` scoped selector in UiChart.vue
  **Acceptance criteria:** The `.ui-chart__root` selector on line ~54 of `UiChart.vue` is either removed (relying on `:deep(.p-chart)` as the working selector) or converted to `:deep(.ui-chart__root)`. The plain scoped selector cannot match because PrimeVue renders the element outside the scoped boundary.

- [ ] `FT-TODO-030` Replace raw rem values in UiConfirmDialogHost.vue with `--ft-*` tokens
  **Acceptance criteria:** `margin-top: 0.125rem` and `font-size: 1.125rem` in `.ui-confirm-dialog__icon` use `--ft-*` tokens. Add tokens to `design-tokens.css` if needed.

- [ ] `FT-TODO-025` Fix 31 pre-existing stylelint property-order warnings in `EvolutionTab.vue` and `analytics-page.css`
  **Acceptance criteria:** `npm run lint:style` passes with 0 warnings from those two files.

- [ ] `FT-TODO-031` Create UiTextarea.vue and co-locate `.p-inputtextarea` styles
  **Acceptance criteria:** A `UiTextarea.vue` wrapper component exists in `src/ui/`. The `.p-inputtextarea` overrides currently in `src/styles/prime-textarea.css` are moved into its `<style scoped>` block as `:deep(.p-inputtextarea)`. The `prime-textarea.css` file and its import in `main.ts` are deleted.

---

## Marketing

- [ ] `FT-TODO-010` Reduce and restructure landing page content  
  **Acceptance criteria:** landing page follows compact structure (hero + key sections) without excessive text density.