- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

- [ ] `FT-TODO-037` Fix pre-existing `no-explicit-any` errors in `main.ts`
  **Context:** `npm run lint` reports 22 `@typescript-eslint/no-explicit-any` errors in `vue-app/src/main.ts` (lines 95–135). These pre-date FT-TODO-034 and block `--max-warnings=0` from passing cleanly.
  **Files:** `vue-app/src/main.ts`

## Analytics Page UX Improvements

- [ ] `FT-TODO-035` SpendingPieCard — group categories < 5% into expandable "Прочее"
  **Context:** Many categories have < 5% share, creating thin unreadable donut arcs. Users should see a clean chart, but still be able to drill into small categories.
  **Implementation:**
  1. `vue-app/src/types/analytics.ts` → add `children?: CategoryLegendItem[]` to `CategoryLegendItem`.
  2. `useAnalyticsPageMetrics.ts` → `filteredCategoryLegend`: after sorting, split items into `mainItems` (percent ≥ 5%) and `otherItems` (percent < 5%). If `otherItems.length > 0`, append a synthetic entry `{ id: '__other__', name: 'Прочее', color: <neutral grey token>, amount: sum, percent: sum%, children: otherItems }`. `categoryChartData` uses this computed automatically, so the grey slice appears in the chart.
  3. `SpendingPieCard.vue`:
     - Add `const isOtherExpanded = ref(false)` local state
     - In legend, detect `item.id === '__other__'`: render as a chevron toggle row (no navigation on click, just toggle expansion)
     - When expanded, render `item.children` as indented sub-rows
     - Sub-rows fire `emit('select-category', child)` → navigates to transactions for that category + month date range
     - `watch([mode, scope], () => isOtherExpanded.value = false)` to reset on filter change
  **Files:** `vue-app/src/types/analytics.ts`, `vue-app/src/composables/useAnalyticsPageMetrics.ts`, `vue-app/src/components/analytics/SpendingPieCard.vue`
  **Acceptance criteria:** Months with many small categories show a grey "Прочее" arc. Clicking "Прочее" in legend expands sub-items. Clicking a sub-item navigates to that category's transactions. Switching mode/scope collapses the expansion.

- [ ] `FT-TODO-036` PeakDaysCard — make summary non-interactive, keep only day-row clicks
  **Context:** The summary block (showing total peak share %) is currently a clickable button that navigates to transactions covering all peak days. This is confusing — the individual day rows already handle per-day navigation. The summary should be informational only.
  **Implementation:**
  - `PeakDaysCard.vue`: change the summary element from a `<button>` to a `<div>`. Remove its `@click` handler and any cursor/hover styles.
  - `AnalyticsPage.vue`: remove the `@select-peak-summary="handlePeakSummarySelect"` binding (event no longer emitted).
  - The colored accent (≤10% green / ≤25% amber / >25% red) and all displayed values stay unchanged — only interactivity is removed.
  **Files:** `vue-app/src/components/analytics/PeakDaysCard.vue`, `vue-app/src/pages/AnalyticsPage.vue`
  **Acceptance criteria:** Summary block is not clickable and shows no hover/pointer cursor. Individual day rows still navigate to transactions on click.
