## Analytics

- [ ] `FT-TODO-MONEY` explore the opportunity to uncomment throwing exception in Money.ctr() if amount is negative or zero. Is Money should handle negative amounts?

---

## Modals & Interaction Patterns

- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

---

## Forms & Branding Alignment

- [ ] `FT-TODO-037` Standardize brand styling for all select-button controls (including `CategoriesPage.vue`)
  **Acceptance criteria:** all SelectButton-like controls share one token-driven brand style contract (active, inactive, hover, focus, border/radius, typography) consistent with `DESIGN.md` and `design-tokens.css`.
