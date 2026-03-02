## Analytics Backend

- [ ] `FT-TODO-041` Consolidate `"Без категории"` / `"#9e9e9e"` magic strings in `TransactionCategoryService` and `TransactionsService` to use `AnalyticsCommon` constants or a shared domain constant — currently these literals still appear in non-analytics code after the `AnalyticsCommon` consolidation.
  **Files:** `FinTree.Application/Transactions/TransactionCategoryService.cs`, `FinTree.Application/Transactions/TransactionsService.cs`

- [ ] `FT-TODO-042` Eliminate double DB fetch in `DashboardService` — `MonthlyAggregator` (2-month window) and `SpendingBreakdownService` (12-month window) each issue independent `GetTransactionSnapshotsAsync` + `GetCrossRatesAsync` calls per request. Consolidate via a shared pre-fetched dataset or result caching.
  **Files:** `FinTree.Application/Analytics/Services/DashboardService.cs`, `FinTree.Application/Analytics/Services/SpendingBreakdownService.cs`

## Frontend

- [ ] `FT-TODO-032` Split TransactionForm.vue into smaller units and remove temporary `max-lines` suppression
  **Acceptance criteria:** `src/components/TransactionForm.vue` no longer uses file-level `eslint-disable max-lines`; logic/template are extracted into focused child components or composables, and `npm run lint` passes without that suppression.

## Analytics Page UX Improvements

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