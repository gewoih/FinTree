## Analytics

- [ ] `FT-TODO-MONEY` explore the opportunity to uncomment throwing exception in Money.ctr() if amount is negative or zero. Is Money should handle negative amounts?

---

## Modals & Interaction Patterns

- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

---

## UX Consistency & Analytics Clarity

- [ ] `FT-TODO-040` Remove duplicate borders in list filters and migrate search fields to PrimeVue `IconField` (`ListToolbar.vue`, transaction filters)
  **Acceptance criteria:** search controls use `IconField`/`InputIcon`; search, `Select`, and `DatePicker` controls in filters render with a single border layer in idle/hover/focus/invalid states.

- [ ] `FT-TODO-044` Prevent negative `liquidMonths` values in analytics (dashboard + evolution)
  **Acceptance criteria:** `liquidMonths` is clamped to `>= 0` before API response mapping for all analytics endpoints;