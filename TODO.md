## Analytics

- [ ] `FT-TODO-MONEY` explore the opportunity to uncomment throwing exception in Money.ctr() if amount is negative or zero. Is Money should handle negative amounts?

---

## Modals & Interaction Patterns

- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

---

## UX Consistency & Analytics Clarity

- [ ] `FT-TODO-038` Align password field width and embed eye toggle into the input control on auth pages (`LoginPage.vue`, `RegisterPage.vue`)
  **Acceptance criteria:** password control has the same usable width as other form controls; show/hide icon is visually integrated into the input (not detached); behavior and alignment are consistent on desktop and mobile.

- [ ] `FT-TODO-039` Restore visual spacing between filters toolbar and accounts grid on `AccountsPage.vue`
  **Acceptance criteria:** there is a clear vertical separation between filters and the first row of account cards in all states (loaded/empty/error); spacing is token-driven and consistent with nearby page sections.

- [ ] `FT-TODO-040` Remove duplicate borders in list filters and migrate search fields to PrimeVue `IconField` (`ListToolbar.vue`, transaction filters)
  **Acceptance criteria:** search controls use `IconField`/`InputIcon`; search, `Select`, and `DatePicker` controls in filters render with a single border layer in idle/hover/focus/invalid states.

- [ ] `FT-TODO-041` Fix vertical text alignment in all `Select` components
  **Acceptance criteria:** selected value, placeholder, and dropdown icon are vertically centered across all select instances and sizes; alignment is controlled by shared theme contract rather than per-page overrides.

- [ ] `FT-TODO-042` Invert X/Y axes in evolution table presentation
  **Acceptance criteria:** evolution table is transposed to the new axis orientation while preserving values, deltas, sorting intent, sticky headers, and mobile horizontal-scroll usability.

- [ ] `FT-TODO-043` Consolidate typography to Inter only across the Vue app
  **Acceptance criteria:** design tokens and component styles no longer reference alternative font families (including mono fallbacks) unless explicitly approved; UI renders with Inter as the single configured family.

- [ ] `FT-TODO-044` Prevent negative `liquidMonths` values in analytics (dashboard + evolution)
  **Acceptance criteria:** `liquidMonths` is clamped to `>= 0` before API response mapping for all analytics endpoints; add/update tests for negative-balance and low-liquidity scenarios.

- [ ] `FT-TODO-045` Improve user understanding of Stability Index (copy + UX, with possible metric rethink)
  **Acceptance criteria:** dashboard/evolution surfaces explain what affects the metric, how to interpret “good/bad”, and what action to take; wording is simplified for low-financial-literacy users; if metric definition changes, mapping and labels remain consistent across frontend/backend.
