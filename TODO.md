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

- [ ] `FT-TODO-040` SummaryStrip — zone progress bar for the 4 metric cards
  **Context:** Metric cards (Сбережения, Финансовая подушка, Стабильность трат, Необязательные) show numbers with no benchmark context. A segmented zone bar with a marker communicates the quality of each value at a glance.
  **Zone definitions (frontend-only):**
  | Key | Thresholds (poor/avg boundary, avg/good boundary) | scaleMax | inverted |
  |-----|--------------------------------------------------|---------|---------|
  | savings | 0.1, 0.2 | 0.5 | false |
  | cushion | 1, 3 | 12 | false |
  | stability | 40, 70 | 100 | false |
  | discretionary | 25, 45 | 60 | true |
  Zone widths = `(zoneEnd - zoneStart) / scaleMax × 100%`. Marker = `clamp(value/scaleMax, 0, 1) × 100%`. Inverted = color order flips (green left → red right).
  **Implementation:**
  1. `vue-app/src/types/analytics-page.ts` → add `ZoneBarConfig` interface: `{ value: number, scaleMax: number, thresholds: [number, number], inverted?: boolean }`
  2. Extend `SummaryMetric` (in `SummaryStrip.vue` or `analytics-page.ts`) with optional `zoneBar?: ZoneBarConfig`
  3. New `vue-app/src/components/ui/UiZoneBar.vue`: props = `ZoneBarConfig`. Layout: 4px segmented bar (3 segments with 2px gap) + 6×6px white diamond marker positioned absolutely. Segment colors: danger/warning/success (or flipped if inverted). Marker positioned via `left: clamp(value/scaleMax, 0, 1) * 100%`.
  4. `SummaryStrip.vue` → render `<UiZoneBar>` at card bottom when `metric.zoneBar` is set (`margin-top: var(--ft-space-3)`)
  5. `useAnalyticsPage.ts` (or `useAnalyticsPageMetrics.ts`) → add `zoneBar` config to each of the 4 metric objects using raw values already available in the composable
  **Files:** `vue-app/src/types/analytics-page.ts`, `vue-app/src/components/ui/UiZoneBar.vue` (new), `vue-app/src/components/analytics/SummaryStrip.vue`, `vue-app/src/composables/useAnalyticsPage.ts` (or useAnalyticsPageMetrics.ts)
  **Acceptance criteria:** Each of the 4 metric cards has a zone bar at the bottom. Marker position reflects current value. Savings 78.3% → marker at right edge. Stability 64 → marker in amber zone. Cards without `zoneBar` unaffected.

- [ ] `FT-TODO-042` PeakDaysCard — add benchmark reference text
  **Context:** Peak % is colored by threshold (≤10% green, ≤25% amber, >25% red) but users see no reference point explaining what's normal.
  **Implementation:**
  Add computed `benchmarkLabel` based on `props.summary.share`: `≤0.10 → 'норма — до 10%'`, `≤0.25 → 'повышенный — до 25% допустимо'`, `>0.25 → 'высокий — рекомендовано до 25%'`. Render as `<span class="peak-days__benchmark">` below the metadata line. CSS: `--ft-font-size-xs`, `--ft-text-secondary`.
  **Files:** `vue-app/src/components/analytics/PeakDaysCard.vue`
  **Acceptance criteria:** Benchmark label appears below peak days metadata. Text varies by current zone.

- [ ] `FT-TODO-043` CategoryDeltaCard — bar widths proportional to ₽ amount
  **Context:** `barWidth()` uses `deltaPercent` as primary, making a +122% / +1 937₽ bar wider than a -91% / -36 658₽ bar. Width must reflect ₽ magnitude, not % change.
  **Implementation:** Remove the `deltaPercent` branch from `barWidth()`. Always use: `(Math.abs(item.deltaAmount) / maxDelta) * 100`, clamped 4–100%. The fallback logic already present is correct.
  **Files:** `vue-app/src/components/analytics/CategoryDeltaCard.vue`
  **Acceptance criteria:** Widest bar in each direction = largest absolute ₽ delta. Equal ₽ amounts → equal bar widths regardless of % change.