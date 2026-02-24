## Analytics

- [ ] `FT-TODO-024` Avoid repeated per-month projection of allTransactions in GetEvolutionAsync
  **Acceptance criteria:** `allTransactions` is projected into its tuple form once before the monthly loop and reused, instead of being re-projected on every iteration via `.Select(...)` inside `ComputeNetWorthAt`'s call site.

- [ ] `FT-TODO-025` GetEvolutionAsync makes N async calls to CurrencyConverter inside the month loop (one per month). Pre-fetch all needed rates before the loop (similar to GetNetWorthTrendAsync pattern) to reduce to O(1) currency service calls.

- [ ] `FT-TODO-026` ComputeBalanceAt in GetEvolutionAsync duplicates balance reconstruction logic that also exists in GetNetWorthTrendAsync (ApplyBalanceEvent). Consider extracting a shared private helper to eliminate the maintenance risk of formula divergence.

- [ ] `FT-TODO-027` useEvolutionTab monthOverMonthDelta suppresses delta when prev === 0. This guard is correct for percentage change but wrong for absolute delta. Review before shipping Evolution UI — for now delta is informational only.

- [ ] `FT-TODO-028` useEvolutionTab previousMonthValue does not align correctly with currentMonthValue when trailing months have hasData=false (e.g. current in-progress month). Both should be computed from the same filtered+reversed iteration to avoid off-by-one delta.

- [ ] `FT-TODO-MONEY` explore the opportunity to uncomment throwing exception in Money.ctr() if amount is negative or zero. Is Money should handle negative amounts?

---

## Navigation & Layout

- [ ] `FT-TODO-019` Fix tablet sidebar drawer styling
  **Acceptance criteria:** the drawer close button is positioned correctly within the header (not floating outside it); drawer header, nav links, user card, and logout button match the design system tokens and spacing used in the desktop sidebar.

- [ ] `FT-TODO-018` Strengthen bottom tab bar visual separation in light mode
  **Acceptance criteria:** bottom tab bar is visually distinct from the page background in light mode without relying solely on `border-top` and `box-shadow` (e.g. via a slightly more distinct `--ft-surface-*` token or a stronger border).

---

## Modals & Interaction Patterns

- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

---

## CSS / Styling Technical Debt

- [ ] `FT-TODO-023` Define visual style for UiBadge `secondary` severity
  **Acceptance criteria:** `severity="secondary"` renders with a distinct background, color, and border using `--ft-*` tokens. Currently has no CSS rule — visually unstyled/inherited.

---

## Forms & Branding Alignment

- [ ] `FT-TODO-034` Increase default field size for `UiInputText`, `UiSelect`, and `UiDatePicker` to match design baseline
  **Acceptance criteria:** these wrappers use token-driven sizing that matches `DESIGN.md` form guidance and the target visual baseline (larger touch-friendly controls, consistent label/input spacing, min target size `44x44`).

- [ ] `FT-TODO-035` Reduce focus ring thickness for form inputs while preserving accessibility contrast
  **Acceptance criteria:** focused states in `UiInputText`, `UiSelect`, and `UiDatePicker` use a smaller token-driven ring/outline than current visuals, remain keyboard-visible, and keep non-text contrast at least `3:1` per `DESIGN.md`.

- [ ] `FT-TODO-036` Make net worth chart section in `InvestmentsPage.vue` fill available card height
  **Acceptance criteria:** the "Изменение капитала" chart area expands to use full available panel height (no large unused empty area), with responsive behavior intact at `360px` and desktop widths.

- [ ] `FT-TODO-037` Standardize brand styling for all select-button controls (including `CategoriesPage.vue`)
  **Acceptance criteria:** all SelectButton-like controls share one token-driven brand style contract (active, inactive, hover, focus, border/radius, typography) consistent with `DESIGN.md` and `design-tokens.css`.

---

## Marketing

- [ ] `FT-TODO-010` Reduce and restructure landing page content  
  **Acceptance criteria:** landing page follows compact structure (hero + key sections) without excessive text density.
