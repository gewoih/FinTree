- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.
