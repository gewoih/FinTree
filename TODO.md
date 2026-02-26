## Analytics

- [ ] `FT-TODO-MONEY` explore the opportunity to uncomment throwing exception in Money.ctr() if amount is negative or zero. Is Money should handle negative amounts?

- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

- [ ] `FT-TODO-044` Prevent negative `liquidMonths` values in analytics (dashboard + evolution)
  **Acceptance criteria:** `liquidMonths` is clamped to `>= 0` before API response mapping for all analytics endpoints;

- [ ] `FT-TODO-045` Add total month score to Analytics and Evolution pages using weighted metrics
  **Acceptance criteria:** a single documented weighted formula is used to compute `totalMonthScore`; the same month shows the same score in Analytics and Evolution pages; score rendering handles missing metric values without runtime errors.

- [ ] `FT-TODO-050` Curate highly specific everyday income/expense icon catalog for regular users
  **Acceptance criteria:** category icon picker uses a curated everyday-finance catalog (Iconify-compatible) with clearly semantic icons for common real-life transactions (e.g., groceries, pharmacy, transport, rent, utilities, salary, freelance, cashback, gifts); income and expense pickers each provide broad non-generic coverage; mandatory categories keep at least one explicit semantic icon option; legacy saved `pi-*` icons remain visible/editable without migration.

- [ ] `FT-TODO-052` Add touch-friendly tooltip behavior across pages
  **Acceptance criteria:** tooltip information is accessible on touch devices without hover (tap/long-press/popover fallback); no page relies on hover-only tooltip interactions for critical hints.
