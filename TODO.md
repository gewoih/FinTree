## Analytics

- [ ] `FT-TODO-024` Avoid repeated per-month projection of allTransactions in GetEvolutionAsync
  **Acceptance criteria:** `allTransactions` is projected into its tuple form once before the monthly loop and reused, instead of being re-projected on every iteration via `.Select(...)` inside `ComputeNetWorthAt`'s call site.

- [ ] `FT-TODO-025` GetEvolutionAsync makes N async calls to CurrencyConverter inside the month loop (one per month). Pre-fetch all needed rates before the loop (similar to GetNetWorthTrendAsync pattern) to reduce to O(1) currency service calls.

- [ ] `FT-TODO-026` ComputeBalanceAt in GetEvolutionAsync duplicates balance reconstruction logic that also exists in GetNetWorthTrendAsync (ApplyBalanceEvent). Consider extracting a shared private helper to eliminate the maintenance risk of formula divergence.

- [x] `FT-TODO-027` useEvolutionTab monthOverMonthDelta suppresses delta when prev === 0. This guard is correct for percentage change but wrong for absolute delta. Review before shipping Evolution UI — for now delta is informational only.

- [x] `FT-TODO-028` useEvolutionTab previousMonthValue does not align correctly with currentMonthValue when trailing months have hasData=false (e.g. current in-progress month). Both should be computed from the same filtered+reversed iteration to avoid off-by-one delta.

- [ ] `FT-TODO-MONEY` explore the opportunity to uncomment throwing exception in Money.ctr() if amount is negative or zero. Is Money should handle negative amounts?

---

## Modals & Interaction Patterns

- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

---

## Forms & Branding Alignment

- [x] `FT-TODO-034` Increase default field size for `InputText`, `Select`, and `DatePicker` to match design baseline and WCAG
  **Acceptance criteria:** these wrappers use token-driven sizing that matches `DESIGN.md` form guidance and the target visual baseline (larger touch-friendly controls, consistent label/input spacing, min target size `44x44`).

- [x] `FT-TODO-035` Reduce focus ring thickness for form inputs while preserving accessibility contrast
  **Acceptance criteria:** focused states in `InputText`, `Select`, and `DatePicker` use a smaller token-driven ring/outline than current visuals, remain keyboard-visible, and keep non-text contrast at least `3:1` per `DESIGN.md`.

- [ ] `FT-TODO-036` Make net worth chart section in `InvestmentsPage.vue` fill available card height
  **Acceptance criteria:** the "Изменение капитала" chart area expands to use full available panel height (no large unused empty area), with responsive behavior intact at `360px` and desktop widths.

- [ ] `FT-TODO-037` Standardize brand styling for all select-button controls (including `CategoriesPage.vue`)
  **Acceptance criteria:** all SelectButton-like controls share one token-driven brand style contract (active, inactive, hover, focus, border/radius, typography) consistent with `DESIGN.md` and `design-tokens.css`.

---

## Marketing

- [ ] `FT-TODO-010` Reduce and restructure landing page content  
  **Acceptance criteria:** landing page follows compact structure (hero + key sections) without excessive text density.
