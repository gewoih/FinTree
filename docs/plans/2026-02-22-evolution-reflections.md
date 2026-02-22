# Evolution + Reflections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two new features to FinTree — an Evolution tab showing historical KPI trends, and a Reflections page for structured monthly retrospectives.

**Architecture:** Evolution is a new read-only analytics endpoint + frontend tab inside the existing Analytics page. Reflections is a greenfield CRUD feature with a new domain entity, service, controller, API methods, and a standalone page.

**Tech Stack:** .NET 10 (Clean Architecture, EF Core, PostgreSQL/Npgsql), Vue 3 + TypeScript, Pinia, Chart.js, PrimeVue (unstyled)

---

## Part 1: Evolution

### Task 1: Backend — EvolutionMonthDto + GetEvolutionAsync

**Files:**
- Create: `FinTree.Application/Analytics/EvolutionMonthDto.cs`
- Modify: `FinTree.Application/Analytics/AnalyticsService.cs`

**Step 1: Create the response DTO**

Create `FinTree.Application/Analytics/EvolutionMonthDto.cs`:

```csharp
namespace FinTree.Application.Analytics;

public sealed record EvolutionMonthDto(
    int Year,
    int Month,
    bool HasData,
    decimal? SavingsRate,
    decimal? StabilityIndex,
    decimal? DiscretionaryPercent,
    decimal? NetWorth,
    decimal? LiquidMonths,
    decimal? MeanDaily,
    decimal? PeakDayRatio
);
```

**Step 2: Add `GetEvolutionAsync` to `AnalyticsService.cs`**

Open `FinTree.Application/Analytics/AnalyticsService.cs`. At the end of the class (before the closing brace), add:

```csharp
public async Task<List<EvolutionMonthDto>> GetEvolutionAsync(int months, CancellationToken ct)
{
    var userId = currentUserService.GetCurrentUserId();
    var baseCurrencyCode = await userService.GetBaseCurrencyCodeAsync(ct);

    var now = DateTime.UtcNow;
    // If months == 0: all-time — use a large window (10 years)
    var windowMonths = months > 0 ? months : 120;
    var windowStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
        .AddMonths(-(windowMonths - 1));

    // Load all transactions in the window in a single query
    var allTransactions = await context.Transactions
        .AsNoTracking()
        .Include(t => t.Account)
        .Where(t =>
            t.Account.UserId == userId &&
            !t.Account.IsArchived &&
            !t.IsTransfer &&
            t.OccurredAt >= windowStart)
        .ToListAsync(ct);

    // Load all accounts for net worth computation
    var accounts = await context.Accounts
        .AsNoTracking()
        .Where(a => a.UserId == userId && !a.IsArchived)
        .ToListAsync(ct);

    // Get exchange rates once
    var rates = await currencyConverter.GetRatesAsync(ct);

    var result = new List<EvolutionMonthDto>();

    for (var i = 0; i < windowMonths; i++)
    {
        var monthStart = windowStart.AddMonths(i);
        var monthEnd = monthStart.AddMonths(1);

        // Skip months in the future
        if (monthStart > now) break;

        var monthExpenses = allTransactions
            .Where(t =>
                t.Type == TransactionType.Expense &&
                t.OccurredAt >= monthStart &&
                t.OccurredAt < monthEnd)
            .ToList();

        var monthIncome = allTransactions
            .Where(t =>
                t.Type == TransactionType.Income &&
                t.OccurredAt >= monthStart &&
                t.OccurredAt < monthEnd)
            .Sum(t => currencyConverter.ConvertToBase(t.Money.Amount, t.Money.CurrencyCode, baseCurrencyCode, rates));

        if (!monthExpenses.Any() && monthIncome == 0)
        {
            result.Add(new EvolutionMonthDto(monthStart.Year, monthStart.Month, false,
                null, null, null, null, null, null, null));
            continue;
        }

        // Daily expense aggregation
        var dailyTotals = monthExpenses
            .GroupBy(t => t.OccurredAt.Date)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(t => currencyConverter.ConvertToBase(t.Money.Amount, t.Money.CurrencyCode, baseCurrencyCode, rates)));

        var dailyDiscretionary = monthExpenses
            .Where(t => !t.IsMandatory)
            .GroupBy(t => t.OccurredAt.Date)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(t => currencyConverter.ConvertToBase(t.Money.Amount, t.Money.CurrencyCode, baseCurrencyCode, rates)));

        var monthTotal = dailyTotals.Values.Sum();
        var discretionaryTotal = dailyDiscretionary.Values.Sum();
        var observedDays = dailyTotals.Count;

        var meanDaily = observedDays > 0 ? Round2(monthTotal / observedDays) : 0;
        var savingsRate = monthIncome > 0 ? Round2((monthIncome - monthTotal) / monthIncome) : (decimal?)null;
        var discretionaryPercent = monthTotal > 0 ? Round2(discretionaryTotal / monthTotal * 100) : 0;

        // Stability index: requires >= 4 observed days
        decimal? stabilityIndex = null;
        if (observedDays >= 4)
        {
            var sorted = dailyTotals.Values.OrderBy(x => x).ToList();
            var median = ComputeMedian(sorted);
            if (median > 0)
            {
                var q1 = ComputeQuantile(sorted, 0.25);
                var q3 = ComputeQuantile(sorted, 0.75);
                stabilityIndex = Round2((q3 - q1) / median);
            }
        }

        // Peak day ratio
        decimal? peakDayRatio = null;
        if (dailyDiscretionary.Count >= 1)
        {
            var discValues = dailyDiscretionary.Values.OrderBy(x => x).ToList();
            var threshold = ComputePeakThreshold(discValues);
            var peakCount = discValues.Count(v => v >= threshold);
            var daysInMonth = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
            peakDayRatio = Round2((decimal)peakCount / daysInMonth * 100);
        }

        // Net worth: sum of all account balances adjusted by transactions up to month end
        // Reuse the same balance-from-transactions approach as GetNetWorthTrendAsync
        var netWorth = ComputeNetWorthAt(monthEnd, accounts, allTransactions, baseCurrencyCode, rates);

        // Liquid months
        decimal? liquidMonths = null;
        if (meanDaily > 0)
        {
            var liquidAssets = accounts
                .Where(a => a.IsLiquid)
                .Sum(a => currencyConverter.ConvertToBase(
                    ComputeBalanceAt(a, monthEnd, allTransactions),
                    a.CurrencyCode, baseCurrencyCode, rates));
            liquidMonths = Round2(liquidAssets / (meanDaily * 30.44m));
        }

        result.Add(new EvolutionMonthDto(
            monthStart.Year,
            monthStart.Month,
            true,
            savingsRate,
            stabilityIndex,
            discretionaryPercent,
            netWorth,
            liquidMonths,
            meanDaily,
            peakDayRatio));
    }

    return result;
}
```

> **Note:** `ComputeNetWorthAt` and `ComputeBalanceAt` are private helpers you will add in Step 3. `ComputeMedian`, `ComputeQuantile`, `ComputePeakThreshold`, and `Round2` are already private methods on this class — reuse them directly.

**Step 3: Add private helpers for net worth calculation**

Still in `AnalyticsService.cs`, add these private helpers after `GetEvolutionAsync`:

```csharp
private decimal ComputeNetWorthAt(
    DateTime asOf,
    List<Account> accounts,
    List<Transaction> allTransactions,
    string baseCurrencyCode,
    Dictionary<string, decimal> rates)
{
    return accounts.Sum(a =>
        currencyConverter.ConvertToBase(
            ComputeBalanceAt(a, asOf, allTransactions),
            a.CurrencyCode, baseCurrencyCode, rates));
}

private static decimal ComputeBalanceAt(
    Account account,
    DateTime asOf,
    List<Transaction> allTransactions)
{
    // Start from zero; sum all transactions on this account up to asOf
    // Income transactions increase balance, expenses decrease it
    var txTotal = allTransactions
        .Where(t =>
            t.AccountId == account.Id &&
            t.OccurredAt < asOf)
        .Sum(t => t.Type == TransactionType.Income
            ? t.Money.Amount
            : -t.Money.Amount);

    return txTotal;
}
```

> **Important:** The existing `GetNetWorthTrendAsync` computes net worth using account balance adjustments (opening balance anchor). `ComputeBalanceAt` above uses a transaction-sum approach which is simpler but may differ slightly from the dashboard net worth if balance adjustments exist. Check how `GetNetWorthTrendAsync` computes per-account balances (look at its `BuildLiquidMetricsAsync` pattern around lines 568-584) and replicate that exact approach. The goal is no formula divergence — if the full implementation requires balance adjustments, follow that pattern.

**Step 4: Check that `CurrencyConverter.GetRatesAsync` exists**

Run: `grep -n "GetRatesAsync\|GetAllRates" FinTree.Application/Currencies/CurrencyConverter.cs`

If the method signature is different (e.g. it takes different parameters), adjust the call in `GetEvolutionAsync` to match the actual API. The pattern should be similar to how `GetDashboardAsync` calls the currency converter.

**Step 5: Build to verify compilation**

Run from the repo root:
```bash
dotnet build FinTree.Application/FinTree.Application.csproj
```
Expected: Build succeeded with 0 errors.

---

### Task 2: Backend — Analytics Controller endpoint

**Files:**
- Modify: `FinTree.Api/Controllers/AnalyticsController.cs`

**Step 1: Add the endpoint**

Open `FinTree.Api/Controllers/AnalyticsController.cs`. Add after the existing `GetNetWorthTrend` action:

```csharp
[HttpGet("evolution")]
public async Task<IActionResult> GetEvolution(
    [FromQuery] int months = 12,
    CancellationToken ct = default)
{
    var data = await _analyticsService.GetEvolutionAsync(months, ct);
    return Ok(data);
}
```

The controller uses constructor injection for `AnalyticsService` (already wired — no `Program.cs` change needed).

**Step 2: Build the API project**

```bash
dotnet build FinTree.Api/FinTree.Api.csproj
```
Expected: Build succeeded, 0 errors.

**Step 3: Smoke test (optional, dev only)**

Start the backend and run:
```bash
curl "http://localhost:5000/api/analytics/evolution?months=6" -H "Cookie: <your-dev-cookie>"
```
Expected: JSON array with month objects.

---

### Task 3: Frontend — types + API service

**Files:**
- Modify: `vue-app/src/types.ts`
- Modify: `vue-app/src/services/api.service.ts`

**Step 1: Add EvolutionMonthDto to types.ts**

Open `vue-app/src/types.ts`. Find the `NetWorthSnapshotDto` type (near the bottom of the file). Add after it:

```typescript
export interface EvolutionMonthDto {
  year: number
  month: number
  hasData: boolean
  savingsRate: number | null
  stabilityIndex: number | null
  discretionaryPercent: number | null
  netWorth: number | null
  liquidMonths: number | null
  meanDaily: number | null
  peakDayRatio: number | null
}
```

**Step 2: Add getEvolution to api.service.ts**

Open `vue-app/src/services/api.service.ts`. Find the `getNetWorthTrend` method. Add after it:

```typescript
async getEvolution(months: number): Promise<EvolutionMonthDto[]> {
  const response = await this.client.get<EvolutionMonthDto[]>('/analytics/evolution', {
    params: { months }
  })
  return response.data
},
```

**Step 3: Verify TypeScript compilation**

```bash
cd vue-app && npx tsc --noEmit
```
Expected: No errors.

---

### Task 4: Frontend — useEvolutionTab composable

**Files:**
- Create: `vue-app/src/composables/useEvolutionTab.ts`

**Step 1: Create the composable**

```typescript
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.service'
import type { EvolutionMonthDto } from '@/types'

export type EvolutionKpi =
  | 'savingsRate'
  | 'stabilityIndex'
  | 'discretionaryPercent'
  | 'netWorth'
  | 'liquidMonths'
  | 'meanDaily'
  | 'peakDayRatio'

export type EvolutionRange = 6 | 12 | 0

export const KPI_OPTIONS: { key: EvolutionKpi; label: string }[] = [
  { key: 'savingsRate', label: 'Норма сбережений' },
  { key: 'stabilityIndex', label: 'Индекс стабильности' },
  { key: 'discretionaryPercent', label: 'Необязательные расходы' },
  { key: 'netWorth', label: 'Чистый капитал' },
  { key: 'liquidMonths', label: 'Финансовая подушка' },
  { key: 'meanDaily', label: 'Средние расходы в день' },
  { key: 'peakDayRatio', label: 'Доля пиковых дней' },
]

export function useEvolutionTab() {
  const data = ref<EvolutionMonthDto[]>([])
  const state = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
  const error = ref<string | null>(null)

  const selectedKpi = ref<EvolutionKpi>('savingsRate')
  const selectedRange = ref<EvolutionRange>(12)

  async function load() {
    if (state.value === 'loading') return
    state.value = 'loading'
    error.value = null
    try {
      data.value = await apiService.getEvolution(selectedRange.value)
      state.value = 'success'
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Ошибка загрузки данных'
      state.value = 'error'
    }
  }

  async function changeRange(range: EvolutionRange) {
    selectedRange.value = range
    await load()
  }

  const chartLabels = computed(() =>
    data.value.map(m => {
      const d = new Date(m.year, m.month - 1, 1)
      return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
    })
  )

  const chartValues = computed(() =>
    data.value.map(m => (m.hasData ? (m[selectedKpi.value] ?? null) : null))
  )

  const currentMonthValue = computed(() => {
    const last = [...data.value].reverse().find(m => m.hasData)
    return last ? last[selectedKpi.value] : null
  })

  const previousMonthValue = computed(() => {
    const months = data.value.filter(m => m.hasData)
    return months.length >= 2 ? months[months.length - 2][selectedKpi.value] : null
  })

  const monthOverMonthDelta = computed(() => {
    const cur = currentMonthValue.value
    const prev = previousMonthValue.value
    if (cur == null || prev == null || prev === 0) return null
    return cur - prev
  })

  return {
    data,
    state,
    error,
    selectedKpi,
    selectedRange,
    chartLabels,
    chartValues,
    currentMonthValue,
    monthOverMonthDelta,
    load,
    changeRange,
  }
}
```

**Step 2: Verify TypeScript compilation**

```bash
cd vue-app && npx tsc --noEmit
```
Expected: No errors.

---

### Task 5: Frontend — EvolutionTab component + Analytics page tabs

**Files:**
- Create: `vue-app/src/components/analytics/EvolutionTab.vue`
- Modify: `vue-app/src/pages/AnalyticsPage.vue`

**Step 1: Create EvolutionTab.vue**

Create `vue-app/src/components/analytics/EvolutionTab.vue`:

```vue
<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js'
import { useEvolutionTab, KPI_OPTIONS } from '@/composables/useEvolutionTab'
import type { EvolutionRange } from '@/composables/useEvolutionTab'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const {
  state,
  error,
  selectedKpi,
  selectedRange,
  chartLabels,
  chartValues,
  currentMonthValue,
  monthOverMonthDelta,
  load,
  changeRange,
} = useEvolutionTab()

onMounted(load)

watch(selectedKpi, () => {
  // No re-fetch: all KPI data is already loaded
})

const RANGES: { value: EvolutionRange; label: string }[] = [
  { value: 6, label: '6 мес' },
  { value: 12, label: '12 мес' },
  { value: 0, label: 'Всё' },
]

const chartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      data: chartValues.value,
      borderColor: '#D4DE95',
      backgroundColor: 'transparent',
      pointBackgroundColor: '#D4DE95',
      spanGaps: false,
      tension: 0.3,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(255,255,255,0.06)' } },
  },
}

const deltaLabel = computed(() => {
  const d = monthOverMonthDelta.value
  if (d == null) return null
  const sign = d >= 0 ? '+' : ''
  return `${sign}${d.toFixed(2)} к прошлому месяцу`
})
</script>

<template>
  <div class="evolution-tab">
    <!-- Range filter -->
    <div class="evolution-tab__ranges" role="group" aria-label="Период">
      <button
        v-for="r in RANGES"
        :key="r.value"
        class="evolution-tab__range-btn"
        :class="{ 'evolution-tab__range-btn--active': selectedRange === r.value }"
        @click="changeRange(r.value)"
      >
        {{ r.label }}
      </button>
    </div>

    <!-- KPI selector -->
    <select
      v-model="selectedKpi"
      class="evolution-tab__kpi-select"
      aria-label="Показатель"
    >
      <option v-for="opt in KPI_OPTIONS" :key="opt.key" :value="opt.key">
        {{ opt.label }}
      </option>
    </select>

    <!-- Chart area -->
    <div class="evolution-tab__chart-wrap" role="img" :aria-label="`График: ${KPI_OPTIONS.find(o => o.key === selectedKpi)?.label}`">
      <template v-if="state === 'loading'">
        <div class="evolution-tab__loading">Загрузка…</div>
      </template>
      <template v-else-if="state === 'error'">
        <div class="evolution-tab__error">{{ error }}</div>
      </template>
      <template v-else>
        <Line :data="chartData" :options="chartOptions" />
      </template>
    </div>

    <!-- Current value + delta -->
    <div v-if="currentMonthValue != null" class="evolution-tab__summary">
      <span class="evolution-tab__current">Текущий месяц: {{ currentMonthValue }}</span>
      <span v-if="deltaLabel" class="evolution-tab__delta">{{ deltaLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.evolution-tab {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: var(--ft-space-4);
}

.evolution-tab__ranges {
  display: flex;
  gap: var(--ft-space-2);
}

.evolution-tab__range-btn {
  padding: var(--ft-space-1) var(--ft-space-3);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
  background: transparent;
  color: var(--ft-text-secondary);
  cursor: pointer;
  font-size: var(--ft-text-sm);
  transition: all var(--ft-transition-fast);
}

.evolution-tab__range-btn--active {
  border-color: var(--ft-primary-400);
  color: var(--ft-primary-400);
  background: color-mix(in srgb, var(--ft-primary-400) 10%, transparent);
}

.evolution-tab__kpi-select {
  width: 100%;
  padding: var(--ft-space-2) var(--ft-space-3);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
  background: var(--ft-surface-base);
  color: var(--ft-text-primary);
  font-size: var(--ft-text-sm);
}

.evolution-tab__chart-wrap {
  height: 240px;
  position: relative;
}

.evolution-tab__loading,
.evolution-tab__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
}

.evolution-tab__summary {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.evolution-tab__current {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);
  font-variant-numeric: tabular-nums;
}

.evolution-tab__delta {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}
</style>
```

> **Note:** If `vue-chartjs` is not installed, run `npm install vue-chartjs chart.js` in `vue-app/`. Check `vue-app/package.json` first — it may already be a dependency.

**Step 2: Check if vue-chartjs is installed**

```bash
grep -n "vue-chartjs\|chart.js" vue-app/package.json
```

If not present, install:
```bash
cd vue-app && npm install vue-chartjs chart.js
```

**Step 3: Add tab switcher to AnalyticsPage.vue**

Open `vue-app/src/pages/AnalyticsPage.vue`.

At the top of the `<script setup>`, import `EvolutionTab`:
```typescript
import EvolutionTab from '@/components/analytics/EvolutionTab.vue'
import { ref } from 'vue'

const activeTab = ref<'current' | 'evolution'>('current')
```

In the template, find the existing month selector section (around line 66). Wrap the existing content in a tab structure. Add the tab switcher above the month selector, and wrap the existing analytics grid and the new EvolutionTab with `v-if`:

```html
<!-- Tab switcher — add at top of the main content area -->
<div class="analytics-page__tabs" role="tablist">
  <button
    role="tab"
    :aria-selected="activeTab === 'current'"
    class="analytics-page__tab"
    :class="{ 'analytics-page__tab--active': activeTab === 'current' }"
    @click="activeTab = 'current'"
  >
    Сейчас
  </button>
  <button
    role="tab"
    :aria-selected="activeTab === 'evolution'"
    class="analytics-page__tab"
    :class="{ 'analytics-page__tab--active': activeTab === 'evolution' }"
    @click="activeTab = 'evolution'"
  >
    Динамика
  </button>
</div>

<!-- Wrap existing content in v-show="activeTab === 'current'" -->
<!-- Wrap EvolutionTab in v-show="activeTab === 'evolution'" -->
<EvolutionTab v-show="activeTab === 'evolution'" />
```

Use `v-show` (not `v-if`) for the existing content so month state is preserved on tab switch. Use `v-show` for `EvolutionTab` so it mounts once and stays mounted after the first load.

**Step 4: Add tab styles to the analytics page CSS file**

Open `vue-app/src/styles/pages/analytics-page.css` (referenced at line 241 of AnalyticsPage.vue). Add:

```css
.analytics-page__tabs {
  display: flex;
  gap: var(--ft-space-1);
  padding: 0 var(--ft-space-4);
  border-bottom: 1px solid var(--ft-border-default);
  margin-bottom: var(--ft-space-4);
}

.analytics-page__tab {
  padding: var(--ft-space-2) var(--ft-space-4);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  cursor: pointer;
  transition: all var(--ft-transition-fast);
}

.analytics-page__tab--active {
  color: var(--ft-primary-400);
  border-bottom-color: var(--ft-primary-400);
}
```

> **CSS blast radius check:** Before editing `analytics-page.css`, verify it's only used by `AnalyticsPage.vue`. Run: `grep -r "analytics-page.css" vue-app/src/`. If it's imported elsewhere, co-locate all styles into `AnalyticsPage.vue` first, then proceed.

**Step 5: Run the dev server and manually verify**

```bash
cd vue-app && npm run dev
```

Open `/analytics`. Verify:
- Two tabs appear: "Сейчас" and "Динамика"
- "Сейчас" tab shows existing analytics content
- "Динамика" tab shows KPI selector, range filters, and a line chart
- Switching KPI selector changes the chart data instantly (no loading spinner)
- Switching range filter re-fetches and updates the chart

---

## Part 2: Reflections

### Task 6: Backend — MonthlyRetrospective domain entity

**Files:**
- Create: `FinTree.Domain/Retrospectives/MonthlyRetrospective.cs`

**Step 1: Create the entity**

Create directory `FinTree.Domain/Retrospectives/` and file `MonthlyRetrospective.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Base;

namespace FinTree.Domain.Retrospectives;

public sealed class MonthlyRetrospective : Entity
{
    public Guid UserId { get; private set; }

    [MaxLength(7)]
    public string Month { get; private set; } = default!; // "YYYY-MM"

    public DateTimeOffset? BannerDismissedAt { get; private set; }

    [MaxLength(2000)]
    public string? WhatWentWell { get; private set; }

    [MaxLength(2000)]
    public string? OverspendingAreas { get; private set; }

    [MaxLength(2000)]
    public string? MainLesson { get; private set; }

    [MaxLength(2000)]
    public string? NextMonthIntention { get; private set; }

    public int? DisciplineRating { get; private set; }
    public int? ImpulseControlRating { get; private set; }
    public int? SatisfactionRating { get; private set; }

    private MonthlyRetrospective() { } // EF Core

    public static MonthlyRetrospective Create(Guid userId, string month)
    {
        return new MonthlyRetrospective
        {
            UserId = userId,
            Month = month,
        };
    }

    public void DismissBanner()
    {
        BannerDismissedAt = DateTimeOffset.UtcNow;
    }

    public void Update(
        string? whatWentWell,
        string? overspendingAreas,
        string? mainLesson,
        string? nextMonthIntention,
        int? disciplineRating,
        int? impulseControlRating,
        int? satisfactionRating)
    {
        WhatWentWell = whatWentWell;
        OverspendingAreas = overspendingAreas;
        MainLesson = mainLesson;
        NextMonthIntention = nextMonthIntention;
        DisciplineRating = disciplineRating;
        ImpulseControlRating = impulseControlRating;
        SatisfactionRating = satisfactionRating;
    }
}
```

**Step 2: Build domain project**

```bash
dotnet build FinTree.Domain/FinTree.Domain.csproj
```
Expected: Build succeeded, 0 errors.

---

### Task 7: Backend — DbContext + EF Migration

**Files:**
- Modify: `FinTree.Application/Abstractions/IAppDbContext.cs`
- Modify: `FinTree.Infrastructure/Database/AppDbContext.cs`

**Step 1: Add DbSet to IAppDbContext**

Open `FinTree.Application/Abstractions/IAppDbContext.cs`. Add:
- Import: `using FinTree.Domain.Retrospectives;`
- In the interface body: `DbSet<MonthlyRetrospective> Retrospectives { get; }`

**Step 2: Add DbSet to AppDbContext**

Open `FinTree.Infrastructure/Database/AppDbContext.cs`. Add:
- Import: `using FinTree.Domain.Retrospectives;`
- In the class body: `public DbSet<MonthlyRetrospective> Retrospectives => Set<MonthlyRetrospective>();`

Also add a unique index in `OnModelCreating` (after existing entity configurations):
```csharp
modelBuilder.Entity<MonthlyRetrospective>()
    .HasIndex(r => new { r.UserId, r.Month })
    .IsUnique();
```

**Step 3: Build to check for errors before migration**

```bash
dotnet build FinTree.Infrastructure/FinTree.Infrastructure.csproj
```
Expected: Build succeeded, 0 errors.

**Step 4: Create EF Core migration**

Run from repo root:
```bash
dotnet ef migrations add AddMonthlyRetrospective \
  --project FinTree.Infrastructure \
  --startup-project FinTree.Api
```
Expected: Migration file created in `FinTree.Infrastructure/Database/Migrations/`.

**Step 5: Verify migration file**

Open the new migration file. It should contain:
- `CreateTable("MonthlyRetrospectives", ...)` with all columns
- A unique index on `(UserId, Month)`

If the table name is wrong (EF may use `MonthlyRetrospective` vs `MonthlyRetrospectives`), add explicit table name mapping in `OnModelCreating`:
```csharp
modelBuilder.Entity<MonthlyRetrospective>().ToTable("MonthlyRetrospectives");
```

Then drop and recreate the migration.

> **Note:** Migration is applied automatically on app startup via `appDbContext.Database.MigrateAsync()` in `Program.cs` (line 304). No manual `dotnet ef database update` is needed in dev.

---

### Task 8: Backend — RetrospectiveService

**Files:**
- Create: `FinTree.Application/Retrospectives/RetrospectiveService.cs`
- Create: `FinTree.Application/Retrospectives/RetrospectiveDtos.cs`

**Step 1: Create DTOs**

Create `FinTree.Application/Retrospectives/RetrospectiveDtos.cs`:

```csharp
namespace FinTree.Application.Retrospectives;

public sealed record RetrospectiveListItemDto(
    string Month,
    int? SatisfactionRating,
    string? NextMonthIntention,
    bool HasContent
);

public sealed record RetrospectiveDto(
    string Month,
    DateTimeOffset? BannerDismissedAt,
    string? WhatWentWell,
    string? OverspendingAreas,
    string? MainLesson,
    string? NextMonthIntention,
    int? DisciplineRating,
    int? ImpulseControlRating,
    int? SatisfactionRating
);

public sealed record UpsertRetrospectiveCommand(
    string Month,
    string? WhatWentWell,
    string? OverspendingAreas,
    string? MainLesson,
    string? NextMonthIntention,
    int? DisciplineRating,
    int? ImpulseControlRating,
    int? SatisfactionRating
);
```

**Step 2: Create RetrospectiveService**

Create `FinTree.Application/Retrospectives/RetrospectiveService.cs`:

```csharp
using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Domain.Retrospectives;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Retrospectives;

public sealed class RetrospectiveService(IAppDbContext context, ICurrentUser currentUser)
{
    public async Task<List<RetrospectiveListItemDto>> GetListAsync(CancellationToken ct)
    {
        var userId = currentUser.GetCurrentUserId();
        return await context.Retrospectives
            .AsNoTracking()
            .Where(r => r.UserId == userId && !r.IsDeleted)
            .Where(r => r.WhatWentWell != null
                     || r.OverspendingAreas != null
                     || r.MainLesson != null
                     || r.NextMonthIntention != null
                     || r.DisciplineRating != null
                     || r.ImpulseControlRating != null
                     || r.SatisfactionRating != null)
            .OrderByDescending(r => r.Month)
            .Select(r => new RetrospectiveListItemDto(
                r.Month,
                r.SatisfactionRating,
                r.NextMonthIntention,
                true))
            .ToListAsync(ct);
    }

    public async Task<RetrospectiveDto?> GetByMonthAsync(string month, CancellationToken ct)
    {
        var userId = currentUser.GetCurrentUserId();
        var entity = await context.Retrospectives
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Month == month && !r.IsDeleted, ct);

        if (entity is null) return null;

        return Map(entity);
    }

    public async Task<RetrospectiveDto> UpsertAsync(UpsertRetrospectiveCommand cmd, CancellationToken ct)
    {
        ValidateMonth(cmd.Month);
        ValidateRatings(cmd.DisciplineRating, cmd.ImpulseControlRating, cmd.SatisfactionRating);

        var userId = currentUser.GetCurrentUserId();
        var entity = await context.Retrospectives
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Month == cmd.Month && !r.IsDeleted, ct);

        if (entity is null)
        {
            entity = MonthlyRetrospective.Create(userId, cmd.Month);
            context.Retrospectives.Add(entity);
        }

        entity.Update(
            cmd.WhatWentWell,
            cmd.OverspendingAreas,
            cmd.MainLesson,
            cmd.NextMonthIntention,
            cmd.DisciplineRating,
            cmd.ImpulseControlRating,
            cmd.SatisfactionRating);

        await context.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task DismissBannerAsync(string month, CancellationToken ct)
    {
        ValidateMonth(month);

        var userId = currentUser.GetCurrentUserId();
        var entity = await context.Retrospectives
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Month == month && !r.IsDeleted, ct);

        if (entity is null)
        {
            entity = MonthlyRetrospective.Create(userId, month);
            entity.DismissBanner();
            context.Retrospectives.Add(entity);
        }
        else
        {
            entity.DismissBanner();
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(string month, CancellationToken ct)
    {
        var userId = currentUser.GetCurrentUserId();
        var entity = await context.Retrospectives
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Month == month && !r.IsDeleted, ct);

        if (entity is null) throw new NotFoundException();

        entity.Delete();
        await context.SaveChangesAsync(ct);
    }

    public async Task<bool> HasRetrospectiveOrDismissalAsync(string month, CancellationToken ct)
    {
        var userId = currentUser.GetCurrentUserId();
        return await context.Retrospectives
            .AnyAsync(r => r.UserId == userId && r.Month == month && !r.IsDeleted, ct);
    }

    private static RetrospectiveDto Map(MonthlyRetrospective r) =>
        new(r.Month, r.BannerDismissedAt, r.WhatWentWell, r.OverspendingAreas,
            r.MainLesson, r.NextMonthIntention, r.DisciplineRating,
            r.ImpulseControlRating, r.SatisfactionRating);

    private static void ValidateMonth(string month)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(month, @"^\d{4}-(0[1-9]|1[0-2])$"))
            throw new ArgumentException("Month must be in YYYY-MM format.");
    }

    private static void ValidateRatings(params int?[] ratings)
    {
        foreach (var r in ratings)
            if (r is < 1 or > 5)
                throw new ArgumentOutOfRangeException(nameof(ratings), "Rating must be between 1 and 5.");
    }
}
```

**Step 3: Build**

```bash
dotnet build FinTree.Application/FinTree.Application.csproj
```
Expected: 0 errors.

---

### Task 9: Backend — RetrospectivesController

**Files:**
- Create: `FinTree.Api/Controllers/RetrospectivesController.cs`

**Step 1: Create the controller**

```csharp
using FinTree.Application.Retrospectives;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class RetrospectivesController(RetrospectiveService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken ct)
    {
        var list = await service.GetListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{month}")]
    public async Task<IActionResult> GetByMonth(string month, CancellationToken ct)
    {
        var dto = await service.GetByMonthAsync(month, ct);
        if (dto is null) return NotFound();
        return Ok(dto);
    }

    [HttpGet("banner/{month}")]
    public async Task<IActionResult> GetBannerStatus(string month, CancellationToken ct)
    {
        var exists = await service.HasRetrospectiveOrDismissalAsync(month, ct);
        return Ok(new { showBanner = !exists });
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertRetrospectiveCommand cmd, CancellationToken ct)
    {
        var dto = await service.UpsertAsync(cmd, ct);
        return Ok(dto);
    }

    [HttpPut("{month}")]
    public async Task<IActionResult> Update(string month, [FromBody] UpsertRetrospectiveCommand cmd, CancellationToken ct)
    {
        var merged = cmd with { Month = month };
        var dto = await service.UpsertAsync(merged, ct);
        return Ok(dto);
    }

    [HttpDelete("{month}")]
    public async Task<IActionResult> Delete(string month, CancellationToken ct)
    {
        await service.DeleteAsync(month, ct);
        return NoContent();
    }

    [HttpPost("{month}/dismiss")]
    public async Task<IActionResult> DismissBanner(string month, CancellationToken ct)
    {
        await service.DismissBannerAsync(month, ct);
        return NoContent();
    }
}
```

**Step 2: Register service in Program.cs**

Open `FinTree.Api/Program.cs`. Find the service registrations block (around line 226-235). Add:
```csharp
builder.Services.AddScoped<RetrospectiveService>();
```
Also add the using import at the top:
```csharp
using FinTree.Application.Retrospectives;
```

**Step 3: Build the full solution**

```bash
dotnet build
```
Expected: 0 errors across all projects.

**Step 4: Start the API and verify endpoints respond**

```bash
dotnet run --project FinTree.Api
```
Check swagger at `http://localhost:5000/swagger` — you should see the `/api/retrospectives` routes listed.

---

### Task 10: Frontend — types + API service

**Files:**
- Modify: `vue-app/src/types.ts`
- Modify: `vue-app/src/services/api.service.ts`

**Step 1: Add retrospective types to types.ts**

Open `vue-app/src/types.ts`. Add at the end:

```typescript
export interface RetrospectiveListItemDto {
  month: string
  satisfactionRating: number | null
  nextMonthIntention: string | null
  hasContent: boolean
}

export interface RetrospectiveDto {
  month: string
  bannerDismissedAt: string | null
  whatWentWell: string | null
  overspendingAreas: string | null
  mainLesson: string | null
  nextMonthIntention: string | null
  disciplineRating: number | null
  impulseControlRating: number | null
  satisfactionRating: number | null
}

export interface UpsertRetrospectivePayload {
  month: string
  whatWentWell?: string | null
  overspendingAreas?: string | null
  mainLesson?: string | null
  nextMonthIntention?: string | null
  disciplineRating?: number | null
  impulseControlRating?: number | null
  satisfactionRating?: number | null
}
```

**Step 2: Add API methods to api.service.ts**

```typescript
async getRetrospectives(): Promise<RetrospectiveListItemDto[]> {
  const response = await this.client.get<RetrospectiveListItemDto[]>('/retrospectives')
  return response.data
},

async getRetrospective(month: string): Promise<RetrospectiveDto> {
  const response = await this.client.get<RetrospectiveDto>(`/retrospectives/${month}`)
  return response.data
},

async getBannerStatus(month: string): Promise<{ showBanner: boolean }> {
  const response = await this.client.get<{ showBanner: boolean }>(`/retrospectives/banner/${month}`)
  return response.data
},

async upsertRetrospective(payload: UpsertRetrospectivePayload): Promise<RetrospectiveDto> {
  const response = await this.client.post<RetrospectiveDto>('/retrospectives', payload)
  return response.data
},

async deleteRetrospective(month: string): Promise<void> {
  await this.client.delete(`/retrospectives/${month}`)
},

async dismissBanner(month: string): Promise<void> {
  await this.client.post(`/retrospectives/${month}/dismiss`)
},
```

**Step 3: Verify TypeScript compilation**

```bash
cd vue-app && npx tsc --noEmit
```
Expected: No errors.

---

### Task 11: Frontend — useReflections composable

**Files:**
- Create: `vue-app/src/composables/useReflections.ts`

**Step 1: Create the composable**

```typescript
import { ref } from 'vue'
import { apiService } from '@/services/api.service'
import type { RetrospectiveListItemDto, RetrospectiveDto, UpsertRetrospectivePayload } from '@/types'

export function useReflections() {
  const list = ref<RetrospectiveListItemDto[]>([])
  const listState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
  const listError = ref<string | null>(null)

  async function loadList() {
    listState.value = 'loading'
    listError.value = null
    try {
      list.value = await apiService.getRetrospectives()
      listState.value = 'success'
    } catch (e: unknown) {
      listError.value = e instanceof Error ? e.message : 'Ошибка загрузки'
      listState.value = 'error'
    }
  }

  async function deleteRetro(month: string) {
    await apiService.deleteRetrospective(month)
    list.value = list.value.filter(r => r.month !== month)
  }

  return { list, listState, listError, loadList, deleteRetro }
}

export function useRetrospectiveDetail(month: string) {
  const data = ref<RetrospectiveDto | null>(null)
  const state = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
  const error = ref<string | null>(null)
  const saving = ref(false)

  async function load() {
    state.value = 'loading'
    error.value = null
    try {
      data.value = await apiService.getRetrospective(month)
      state.value = 'success'
    } catch (e: unknown) {
      // 404 = new retrospective
      state.value = 'error'
      error.value = e instanceof Error ? e.message : 'Ошибка'
    }
  }

  async function save(payload: UpsertRetrospectivePayload) {
    saving.value = true
    try {
      data.value = await apiService.upsertRetrospective(payload)
    } finally {
      saving.value = false
    }
  }

  return { data, state, error, saving, load, save }
}
```

---

### Task 12: Frontend — ReflectionsPage.vue + routing + nav

**Files:**
- Create: `vue-app/src/pages/ReflectionsPage.vue`
- Modify: `vue-app/src/router/index.ts`
- Modify: `vue-app/src/composables/useAppShellState.ts`
- Modify: `vue-app/src/components/layout/BottomTabBar.vue`

**Step 1: Create ReflectionsPage.vue**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReflections } from '@/composables/useReflections'

const { list, listState, listError, loadList, deleteRetro } = useReflections()
const router = useRouter()

onMounted(loadList)

function openDetail(month: string) {
  router.push(`/reflections/${month}`)
}

function openNew() {
  router.push('/reflections/new')
}

function formatMonth(month: string) {
  const [year, m] = month.split('-')
  const d = new Date(Number(year), Number(m) - 1, 1)
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="reflections-page">
    <div class="reflections-page__header">
      <h1 class="reflections-page__title">Рефлексии</h1>
      <button class="reflections-page__add-btn" @click="openNew">+ Добавить</button>
    </div>

    <div v-if="listState === 'loading'" class="reflections-page__loading">Загрузка…</div>
    <div v-else-if="listState === 'error'" class="reflections-page__error">{{ listError }}</div>

    <template v-else-if="listState === 'success'">
      <div v-if="list.length === 0" class="reflections-page__empty">
        Нет ни одной рефлексии. Начните с первой!
      </div>
      <div
        v-for="item in list"
        :key="item.month"
        class="reflections-page__card"
        role="button"
        tabindex="0"
        @click="openDetail(item.month)"
        @keydown.enter="openDetail(item.month)"
      >
        <div class="reflections-page__card-top">
          <span class="reflections-page__card-month">{{ formatMonth(item.month) }}</span>
          <span v-if="item.satisfactionRating" class="reflections-page__card-stars">
            {{ '★'.repeat(item.satisfactionRating) }}{{ '☆'.repeat(5 - item.satisfactionRating) }}
          </span>
        </div>
        <p v-if="item.nextMonthIntention" class="reflections-page__card-intention">
          "{{ item.nextMonthIntention }}"
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reflections-page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--ft-space-6) var(--ft-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.reflections-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reflections-page__title {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.reflections-page__add-btn {
  padding: var(--ft-space-2) var(--ft-space-4);
  border: 1px solid var(--ft-primary-400);
  border-radius: var(--ft-radius-md);
  background: transparent;
  color: var(--ft-primary-400);
  font-size: var(--ft-text-sm);
  cursor: pointer;
  transition: all var(--ft-transition-fast);
}

.reflections-page__add-btn:hover {
  background: color-mix(in srgb, var(--ft-primary-400) 10%, transparent);
}

.reflections-page__card {
  padding: var(--ft-space-4);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface-raised);
  cursor: pointer;
  transition: border-color var(--ft-transition-fast);
}

.reflections-page__card:hover {
  border-color: var(--ft-border-strong);
}

.reflections-page__card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--ft-space-2);
}

.reflections-page__card-month {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  font-size: var(--ft-text-base);
}

.reflections-page__card-stars {
  color: var(--ft-primary-400);
  font-size: var(--ft-text-base);
}

.reflections-page__card-intention {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  font-style: italic;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.reflections-page__loading,
.reflections-page__error,
.reflections-page__empty {
  text-align: center;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
  padding: var(--ft-space-8);
}
</style>
```

**Step 2: Add route in router/index.ts**

Open `vue-app/src/router/index.ts`. In the protected routes array (where `/analytics`, `/accounts`, etc. are defined), add:

```typescript
{
  path: '/reflections',
  name: 'reflections',
  component: () => import('@/pages/ReflectionsPage.vue'),
  meta: { requiresAuth: true, title: 'Рефлексии' }
},
{
  path: '/reflections/:month',
  name: 'reflection-detail',
  component: () => import('@/pages/RetroDetailPage.vue'),
  meta: { requiresAuth: true, title: 'Рефлексия' }
},
```

**Step 3: Add nav item in useAppShellState.ts**

Open `vue-app/src/composables/useAppShellState.ts`. Find `primaryNavItems` (line 41). Add Reflections:

```typescript
const primaryNavItems = [
  { label: 'Главная', icon: 'pi-chart-line', to: '/analytics', badge: null },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts', badge: null },
  { label: 'Транзакции', icon: 'pi-list', to: '/transactions', badge: null },
  { label: 'Инвестиции', icon: 'pi-briefcase', to: '/investments', badge: null },
  { label: 'Рефлексии', icon: 'pi-book', to: '/reflections', badge: null },  // ← add
]
```

**Step 4: Add to BottomTabBar.vue**

Open `vue-app/src/components/layout/BottomTabBar.vue`. The tabs array currently has 5 entries with "Ещё" as the last item. Replace "Ещё" tab with Reflections, and move Profile to secondaryNavItems:

```typescript
const tabs = [
  { label: 'Главная', icon: 'pi-chart-line', to: '/analytics' },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts' },
  { label: 'Транзакции', icon: 'pi-list', to: '/transactions' },
  { label: 'Рефлексии', icon: 'pi-book', to: '/reflections' },
  { label: 'Ещё', icon: 'pi-ellipsis-h', to: '/profile' },
]
```

> **Note:** The bottom tab bar should not exceed 5 items for mobile usability. Replacing `/investments` with `/reflections` in the tab bar is a UX judgment call — check with the user if the tab ordering feels right. Investments can remain accessible via the sidebar on desktop.

**Step 5: Verify TypeScript + build**

```bash
cd vue-app && npx tsc --noEmit && npm run build
```
Expected: No errors.

---

### Task 13: Frontend — RetroDetailPage.vue

**Files:**
- Create: `vue-app/src/pages/RetroDetailPage.vue`

**Step 1: Create the page**

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRetrospectiveDetail } from '@/composables/useReflections'
import { apiService } from '@/services/api.service'
import type { AnalyticsDashboardDto } from '@/types'

const route = useRoute()
const router = useRouter()

// "new" opens a month picker; otherwise the month comes from the route
const isNew = route.params.month === 'new'
const month = ref(isNew ? '' : (route.params.month as string))

const { data, state, saving, load, save } = useRetrospectiveDetail(month.value)

// Live financial summary for this month
const summary = ref<AnalyticsDashboardDto | null>(null)
async function loadSummary() {
  if (!month.value) return
  const [year, m] = month.value.split('-').map(Number)
  summary.value = await apiService.getAnalyticsDashboard(year, m)
}

onMounted(async () => {
  if (!isNew) {
    await Promise.all([load(), loadSummary()])
  }
})

// Form state (pre-filled from loaded data or empty)
const form = ref({
  whatWentWell: '',
  overspendingAreas: '',
  mainLesson: '',
  nextMonthIntention: '',
  disciplineRating: null as number | null,
  impulseControlRating: null as number | null,
  satisfactionRating: null as number | null,
})

// Sync form when data loads
watch(data, (d) => {
  if (!d) return
  form.value = {
    whatWentWell: d.whatWentWell ?? '',
    overspendingAreas: d.overspendingAreas ?? '',
    mainLesson: d.mainLesson ?? '',
    nextMonthIntention: d.nextMonthIntention ?? '',
    disciplineRating: d.disciplineRating,
    impulseControlRating: d.impulseControlRating,
    satisfactionRating: d.satisfactionRating,
  }
})

async function handleSave() {
  if (!month.value) return
  await save({ month: month.value, ...form.value })
  router.push('/reflections')
}

function setRating(field: 'disciplineRating' | 'impulseControlRating' | 'satisfactionRating', value: number) {
  form.value[field] = form.value[field] === value ? null : value
}

const summaryHealth = computed(() => summary.value?.health)

function formatMoney(v?: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}
</script>

<template>
  <div class="retro-detail">
    <div class="retro-detail__header">
      <button class="retro-detail__back" @click="router.push('/reflections')">← Назад</button>
      <h1 class="retro-detail__title">
        {{ isNew ? 'Новая рефлексия' : `Рефлексия — ${month}` }}
      </h1>
    </div>

    <!-- Block 1: Auto summary (read-only) -->
    <section class="retro-detail__block">
      <h2 class="retro-detail__block-title">Итоги месяца</h2>
      <div v-if="summaryHealth" class="retro-detail__summary-grid">
        <div class="retro-detail__summary-item">
          <span class="retro-detail__summary-label">Доходы</span>
          <span class="retro-detail__summary-value">{{ formatMoney(summaryHealth.monthIncome) }}</span>
        </div>
        <div class="retro-detail__summary-item">
          <span class="retro-detail__summary-label">Расходы</span>
          <span class="retro-detail__summary-value">{{ formatMoney(summaryHealth.monthTotal) }}</span>
        </div>
        <div class="retro-detail__summary-item">
          <span class="retro-detail__summary-label">Норма сбережений</span>
          <span class="retro-detail__summary-value">
            {{ summaryHealth.savingsRate != null ? `${(summaryHealth.savingsRate * 100).toFixed(1)}%` : '—' }}
          </span>
        </div>
        <div class="retro-detail__summary-item">
          <span class="retro-detail__summary-label">Индекс стабильности</span>
          <span class="retro-detail__summary-value">
            {{ summaryHealth.stabilityIndex?.toFixed(2) ?? '—' }}
          </span>
        </div>
      </div>
      <div v-else class="retro-detail__summary-loading">Загрузка данных…</div>
    </section>

    <!-- Block 2: Self-assessment -->
    <section class="retro-detail__block">
      <h2 class="retro-detail__block-title">Самооценка</h2>

      <div v-for="field in [
        { key: 'disciplineRating', label: 'Дисциплина трекинга' },
        { key: 'impulseControlRating', label: 'Контроль импульсов' },
        { key: 'satisfactionRating', label: 'Общая удовлетворённость' },
      ]" :key="field.key" class="retro-detail__rating-row">
        <span class="retro-detail__rating-label">{{ field.label }}</span>
        <div class="retro-detail__stars">
          <button
            v-for="n in 5"
            :key="n"
            class="retro-detail__star"
            :class="{ 'retro-detail__star--filled': form[field.key as keyof typeof form] != null && (form[field.key as keyof typeof form] as number) >= n }"
            @click="setRating(field.key as any, n)"
          >★</button>
        </div>
      </div>
    </section>

    <!-- Block 3: Reflection text -->
    <section class="retro-detail__block">
      <h2 class="retro-detail__block-title">Рефлексия</h2>

      <div v-for="field in [
        { key: 'whatWentWell', label: 'Что получилось хорошо?' },
        { key: 'overspendingAreas', label: 'Где были перерасходы?' },
        { key: 'mainLesson', label: 'Главный урок месяца' },
      ]" :key="field.key" class="retro-detail__field">
        <label :for="field.key" class="retro-detail__label">{{ field.label }}</label>
        <textarea
          :id="field.key"
          v-model="form[field.key as keyof typeof form]"
          class="retro-detail__textarea"
          rows="3"
        />
      </div>
    </section>

    <!-- Block 4: Intention -->
    <section class="retro-detail__block">
      <h2 class="retro-detail__block-title">Намерение</h2>
      <label for="intention" class="retro-detail__label">В следующем месяце я буду…</label>
      <textarea
        id="intention"
        v-model="form.nextMonthIntention"
        class="retro-detail__textarea"
        rows="2"
      />
    </section>

    <div class="retro-detail__actions">
      <button
        class="retro-detail__save-btn"
        :disabled="saving"
        @click="handleSave"
      >
        {{ saving ? 'Сохранение…' : 'Сохранить' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.retro-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--ft-space-6) var(--ft-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}

.retro-detail__header {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.retro-detail__back {
  background: none;
  border: none;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.retro-detail__title {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.retro-detail__block {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
}

.retro-detail__block-title {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.retro-detail__summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ft-space-3);
}

.retro-detail__summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
  padding: var(--ft-space-3);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
  background: var(--ft-surface-raised);
}

.retro-detail__summary-label {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.retro-detail__summary-value {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  font-variant-numeric: tabular-nums;
}

.retro-detail__rating-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-4);
}

.retro-detail__rating-label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.retro-detail__stars {
  display: flex;
  gap: var(--ft-space-1);
}

.retro-detail__star {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: var(--ft-border-default);
  transition: color var(--ft-transition-fast);
  padding: 0;
  line-height: 1;
}

.retro-detail__star--filled {
  color: var(--ft-primary-400);
}

.retro-detail__field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.retro-detail__label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.retro-detail__textarea {
  width: 100%;
  padding: var(--ft-space-2) var(--ft-space-3);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
  background: var(--ft-surface-base);
  color: var(--ft-text-primary);
  font-size: var(--ft-text-sm);
  resize: vertical;
  font-family: inherit;
  transition: border-color var(--ft-transition-fast);
}

.retro-detail__textarea:focus {
  outline: none;
  border-color: var(--ft-primary-400);
}

.retro-detail__actions {
  padding-bottom: var(--ft-space-8);
}

.retro-detail__save-btn {
  width: 100%;
  padding: var(--ft-space-3);
  border: none;
  border-radius: var(--ft-radius-md);
  background: var(--ft-primary-400);
  color: var(--ft-surface-base);
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  cursor: pointer;
  transition: background var(--ft-transition-fast);
}

.retro-detail__save-btn:hover {
  background: var(--ft-primary-200);
}

.retro-detail__save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

---

### Task 14: Frontend — Banner on AnalyticsPage

**Files:**
- Modify: `vue-app/src/pages/AnalyticsPage.vue`
- Modify: `vue-app/src/composables/useAnalyticsPage.ts`

**Step 1: Add banner logic to useAnalyticsPage.ts**

Open `vue-app/src/composables/useAnalyticsPage.ts`. Add at the top of the composable (after existing refs):

```typescript
const showRetrospectiveBanner = ref(false)

async function checkRetrospectiveBanner() {
  const now = new Date()
  const dayOfMonth = now.getDate()
  // Show banner only in first 7 days of the month
  if (dayOfMonth > 7) {
    showRetrospectiveBanner.value = false
    return
  }
  // Check if previous month has a retrospective or dismissal
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  try {
    const { showBanner } = await apiService.getBannerStatus(monthStr)
    showRetrospectiveBanner.value = showBanner
  } catch {
    showRetrospectiveBanner.value = false
  }
}

async function dismissRetrospectiveBanner() {
  showRetrospectiveBanner.value = false
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  await apiService.dismissBanner(monthStr)
}
```

Call `checkRetrospectiveBanner()` from `onMounted` (or the existing initialization flow — look at where `loadDashboard` is first called and call it alongside).

Add `showRetrospectiveBanner` and `dismissRetrospectiveBanner` to the composable's return object.

**Step 2: Add banner to AnalyticsPage.vue template**

In `AnalyticsPage.vue`, inside the "Сейчас" tab content area, add the banner at the top (before the month selector):

```html
<!-- Retrospective banner -->
<div
  v-if="showRetrospectiveBanner"
  class="analytics-page__retro-banner"
  role="alert"
>
  <span>Прошлый месяц завершён. Хотите подвести итоги?</span>
  <div class="analytics-page__retro-banner-actions">
    <router-link
      :to="`/reflections/${previousMonthStr}`"
      class="analytics-page__retro-banner-link"
    >
      Подвести итоги
    </router-link>
    <button
      class="analytics-page__retro-banner-close"
      aria-label="Закрыть"
      @click="dismissRetrospectiveBanner"
    >
      ✕
    </button>
  </div>
</div>
```

Where `previousMonthStr` is a computed based on the current date:
```typescript
const previousMonthStr = computed(() => {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
})
```

**Step 3: Add banner styles**

In the analytics page CSS file (following the CSS blast radius rule from CLAUDE.md):

```css
.analytics-page__retro-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-4);
  padding: var(--ft-space-3) var(--ft-space-4);
  border: 1px solid color-mix(in srgb, var(--ft-primary-400) 30%, transparent);
  border-radius: var(--ft-radius-md);
  background: color-mix(in srgb, var(--ft-primary-400) 8%, transparent);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);
}

.analytics-page__retro-banner-actions {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  flex-shrink: 0;
}

.analytics-page__retro-banner-link {
  color: var(--ft-primary-400);
  font-weight: var(--ft-font-medium);
  text-decoration: none;
}

.analytics-page__retro-banner-link:hover {
  text-decoration: underline;
}

.analytics-page__retro-banner-close {
  background: none;
  border: none;
  color: var(--ft-text-tertiary);
  cursor: pointer;
  font-size: var(--ft-text-base);
  padding: 0;
  line-height: 1;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Step 4: Full manual verification**

```bash
cd vue-app && npm run dev
```

Verify:
- [ ] Analytics page shows "Сейчас" / "Динамика" tabs
- [ ] "Динамика" shows line chart, KPI selector, range filter
- [ ] Changing KPI switches chart instantly
- [ ] Changing range filter re-fetches
- [ ] Months with no data show as gaps (not zero) in chart
- [ ] "Рефлексии" nav item appears in sidebar (desktop) and bottom tab bar (mobile)
- [ ] Reflections list page loads and shows retrospectives
- [ ] "+" button navigates to create view
- [ ] Detail view loads financial summary from analytics API
- [ ] Star rating works (click to select, click same to deselect)
- [ ] Save navigates back to list
- [ ] Banner appears on Analytics page in first 7 days of month (if no retro exists for prev month)
- [ ] Banner dismiss calls API and hides banner

**Step 5: TypeScript final check**

```bash
cd vue-app && npx tsc --noEmit
```
Expected: 0 errors.

---

## Known Edge Cases (handle during implementation)

1. **`GetEvolutionAsync` net worth calculation:** The simple transaction-sum approach may differ from `GetNetWorthTrendAsync` if balance adjustments are used. Verify against the dashboard and align the formula. See Task 1, Step 3 note.

2. **`CurrencyConverter` API:** The exact method signature for getting rates in bulk may differ from what's shown in the plan. Check the actual `CurrencyConverter.cs` methods and adapt the evolution service call accordingly.

3. **Bottom tab bar item count:** Replacing "Инвестиции" with "Рефлексии" in the bottom tab bar is shown in Task 12. Confirm this is acceptable before committing — Investments remains accessible via the sidebar.

4. **`vue-chartjs` import style:** If Chart.js is already used in analytics components, check how it's imported (some projects use global registration). Follow the existing pattern.

5. **`RetroDetailPage` month picker for "new":** The `/reflections/new` route is wired but the month picker UI is not fully implemented in Task 13. A minimal implementation: show a `<input type="month">` input that sets `month.value` before enabling the form. Enhance later.
