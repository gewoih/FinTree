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

- [ ] `FT-TODO-038` SummaryStrip — soften expense accent color (muted coral instead of danger-red)
  **Context:** Expense numbers use `--ft-danger-400` (#FF756C) which reads as "danger". Normal spending is not an error signal.
  **Implementation:**
  1. `design-tokens.css` → add `--ft-expense-text: #D4877F` in `:root` (dark) and `--ft-expense-text: #A3524D` in `.light-mode`
  2. `SummaryStrip.vue` → update `.summary-strip__value--expense` and `.summary-strip__icon--expense` to use `var(--ft-expense-text)` instead of `var(--ft-danger-400)`. The icon background `color-mix` should also use `var(--ft-expense-text)` as base.
  **Files:** `vue-app/src/assets/design-tokens.css`, `vue-app/src/components/analytics/SummaryStrip.vue`
  **Acceptance criteria:** РАСХОДЫ value and icon use a warm muted coral, visibly softer than danger red. Form validation errors still use `--ft-danger-400` unchanged.

- [ ] `FT-TODO-039` GlobalMonthScoreCard — remove all three status badges
  **Context:** Three badge variants ("Нужна коррекция" <40, "Зона внимания" 40–74, "Все в порядке" 75+) create conflicting signals next to the score and MoM delta. All three are removed.
  **Implementation:**
  1. `GlobalMonthScoreCard.vue` → remove `<p class="global-score__status" :class="statusClass(model.accent)">{{ model.statusLabel }}</p>` and all `.global-score__status` + `.global-score__status--*` CSS rules.
  2. `useGlobalMonthScore.ts` → keep `statusLabel`/`statusDescription` fields (may be needed elsewhere), but they no longer drive any visible element.
  **Files:** `vue-app/src/components/analytics/GlobalMonthScoreCard.vue`
  **Acceptance criteria:** Rating section shows only the numeric score and MoM delta. No badge visible in any score range.

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

- [ ] `FT-TODO-041` SpendingBarsCard — cap Y-axis and label spike bars
  **Context:** A single large daily spend (e.g. 55 000₽ vs average ~4 000₽) makes all other bars unreadable. Capping the Y-axis at P85 of non-zero values and labelling capped bars preserves readability.
  **Implementation:**
  1. Compute `isCapped = spikeFactor > 3` where `spikeFactor = maxValue / averageValue` (reuse existing `averageValue` computed)
  2. When `isCapped`: `cappedMax = p85(nonZeroValues) × 1.2` (p85 = sorted values at index `Math.floor(len × 0.85)`). Set `chartOptions.scales.y.max = cappedMax` dynamically.
  3. Add custom Chart.js plugin `spikeLabelsPlugin` (passed via `<Chart :plugins>`): in `afterDraw`, for each bar in dataset[0] where `data[i] > cappedMax`, draw formatted currency label at `(bar.x, chartArea.top + 4)` using `ctx.fillText`. Use `formatMoney` from `useAnalyticsFormatting`.
  4. When `!isCapped`: no y-axis max override, no plugin draws labels.
  **Files:** `vue-app/src/components/analytics/SpendingBarsCard.vue`
  **Acceptance criteria:** Month with spike (max/avg > 3×): normal bars are readable, spike bars are clipped with ₽ label above. Month without spike: chart unchanged.

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

- [ ] `FT-TODO-044` ForecastCard — smart rounding + baseline comparison text
  **Context:** `fmt()` shows kopecks (110 470,55 ₽) because `maximumFractionDigits` is not set. Users also see a baseline dashed line with no text interpretation.
  **Implementation:**
  1. Replace `fmt()` with tiered rounding: `< 1 000` → 2 decimals, `1 000–99 999` → 0 decimals, `≥ 100 000` → round to nearest 100 (using `Math.round(value / 100) * 100`). Currency-safe via `props.currency`.
  2. Add computed `baselineComparison`: midpoint = (optimistic + risk) / 2; diff = baselineLimit − midpoint; `"На ${fmt(|diff|)} (${pct}%) ниже/выше базовых расходов"`. Return `null` if baseline is null/0.
  3. Render `<span class="forecast-hero__baseline-note">` after the range value. CSS: `--ft-font-size-sm`, `--ft-text-secondary`.
  **Files:** `vue-app/src/components/analytics/ForecastCard.vue`
  **Acceptance criteria:** Range shows no kopecks and large values rounded to 100. Baseline comparison text appears below range. Hidden when baseline unavailable.