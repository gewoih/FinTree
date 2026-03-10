# Block 05 — Analytics Dashboard

> **Для AI-агента:** Этот документ — твоё единственное задание. Не смотри в vue-app/ за референсом. Используй только информацию из этого документа.

## Shared Context

- Репозиторий: monorepo, `react-app/` рядом с `vue-app/`
- Backend API base: `https://localhost:5001` (проксировать через Vite на `/api`)
- Auth: cookie-based сессия (`withCredentials: true` на Axios). Браузер отправляет httpOnly cookie автоматически. Нет ручного `Authorization` header. Refresh через `POST /api/auth/refresh`.
- Locale: ru-RU (все UI тексты, числа, даты на русском)
- Theme: dark по умолчанию (`:root`), light через `.light-mode` на `<html>`
- Min touch target: 44px
- Breakpoints: mobile <640px, tablet <768px, desktop ≥1024px
- Financial values: `font-variant-numeric: tabular-nums`, right-aligned в таблицах
- Каждый data-driven компонент реализует все состояния: loading → error (с кнопкой retry) → empty → success

## Tech Stack

- React 19, TypeScript ~5.x, shadcn/ui, Tailwind CSS v4
- TanStack Router, TanStack Query v5, Zustand v5
- Axios, React Hook Form + Zod, Recharts, Vite

## Depends On

- Block 01 — Project scaffold, routing, Axios instance, auth
- Block 02 — Zustand user store (baseCurrencyCode, isFirstRun, currentUser)
- Block 03 — UI primitives: Card, Button, Skeleton, Badge, Tooltip
- Block 04 — KPICard, shared layout components (PageContainer, PageHeader)

## Goal

Реализовать страницу аналитики (`/`) — центральный дашборд продукта. Страница имеет две вкладки: «Сейчас» (текущий месяц) и «Динамика» (YoY эволюция). Новым пользователям показывается онбординг-степпер вместо дашборда.

По завершении блока должны быть готовы:
- `AnalyticsPage.tsx` с навигацией по месяцам и переключателем вкладок
- `SummaryStrip.tsx` — 3 KPI-метрики в ряд
- `GlobalMonthScoreCard.tsx` — главный score карточка с вложенными `HealthScoreCard`
- `SpendingPieCard.tsx` — donut chart расходов/доходов по категориям
- `SpendingBarsCard.tsx` — bar chart расходов по дням/неделям/месяцам
- `PeakDaysCard.tsx` — список пиковых дней расходов
- `CategoryDeltaCard.tsx` — карточки с изменёнными категориями (рост / снижение)
- `ForecastCard.tsx` — line chart прогноза расходов на конец месяца
- `EvolutionTab.tsx` — вкладка «Динамика» с KPI и таблицей по месяцам
- `OnboardingStepper.tsx` — онбординг для новых пользователей

---

## API

### Типы данных (TypeScript)

```typescript
// AccountType: 0 = Bank, 2 = Crypto, 3 = Brokerage, 4 = Deposit
type TransactionType = 'Income' | 'Expense';
type StabilityStatusCode = 'good' | 'average' | 'poor';

interface FinancialHealthSummaryDto {
  monthIncome: number | null;
  monthTotal: number | null;
  meanDaily: number | null;
  medianDaily: number | null;
  stabilityIndex: number | null;
  stabilityScore: number | null;
  stabilityStatus: StabilityStatusCode | null;
  stabilityActionCode: 'keep_routine' | 'smooth_spikes' | 'cap_impulse_spend' | null;
  savingsRate: number | null;
  netCashflow: number | null;
  discretionaryTotal: number | null;
  discretionarySharePercent: number | null;
  monthOverMonthChangePercent: number | null;
  liquidAssets: number | null;
  liquidMonths: number | null;
  liquidMonthsStatus: 'good' | 'average' | 'poor' | null;
  totalMonthScore: number | null;
  incomeMonthOverMonthChangePercent: number | null;
  balanceMonthOverMonthChangePercent: number | null;
}

interface PeakDaysSummaryDto {
  count: number;
  total: number;
  sharePercent: number | null;
  monthTotal: number | null;
}

interface PeakDayDto {
  year: number;
  month: number;
  day: number;
  amount: number;
  sharePercent: number | null;
}

interface CategoryBreakdownItemDto {
  id: string;
  name: string;
  color: string;
  amount: number;
  mandatoryAmount: number;
  discretionaryAmount: number;
  percent: number | null;
  isMandatory: boolean;
}

interface CategoryDeltaItemDto {
  id: string;
  name: string;
  color: string;
  currentAmount: number;
  previousAmount: number;
  deltaAmount: number;
  deltaPercent: number | null;
}

interface CategoryDeltaDto {
  increased: CategoryDeltaItemDto[];
  decreased: CategoryDeltaItemDto[];
}

interface CategoryBreakdownDto {
  items: CategoryBreakdownItemDto[];
  delta: CategoryDeltaDto;
}

interface SpendingBreakdownDto {
  days: MonthlyExpenseDto[];
  weeks: MonthlyExpenseDto[];
  months: MonthlyExpenseDto[];
}

interface MonthlyExpenseDto {
  year: number;
  month: number;
  day?: number | null;
  week?: number | null;
  amount: number;
}

interface ForecastSummaryDto {
  optimisticTotal: number | null;
  riskTotal: number | null;
  currentSpent: number | null;
  baselineLimit: number | null;
}

interface ForecastSeriesDto {
  days: number[];
  actual: Array<number | null>;
  optimistic: Array<number | null>;
  risk: Array<number | null>;
  baseline: number | null;
}

interface ForecastDto {
  summary: ForecastSummaryDto;
  series: ForecastSeriesDto;
}

interface AnalyticsReadinessDto {
  hasForecastAndStabilityData: boolean;
  observedExpenseDays: number;
  requiredExpenseDays: number;
  hasStabilityDataForSelectedMonth: boolean;
  observedStabilityDaysInSelectedMonth: number;
  requiredStabilityDays: number;
}

interface AnalyticsDashboardDto {
  year: number;
  month: number;
  health: FinancialHealthSummaryDto;
  peaks: PeakDaysSummaryDto;
  peakDays: PeakDayDto[];
  categories: CategoryBreakdownDto;      // расходы по категориям
  incomeCategories: CategoryBreakdownDto; // доходы по категориям
  spending: SpendingBreakdownDto;
  forecast: ForecastDto;
  readiness: AnalyticsReadinessDto;
}

interface NetWorthSnapshotDto {
  year: number;
  month: number;
  netWorth: number;
}

interface EvolutionMonthDto {
  year: number;
  month: number;
  hasData: boolean;
  savingsRate: number | null;
  stabilityIndex: number | null;
  stabilityScore: number | null;
  stabilityStatus: StabilityStatusCode | null;
  stabilityActionCode: 'keep_routine' | 'smooth_spikes' | 'cap_impulse_spend' | null;
  discretionaryPercent: number | null;
  netWorth: number | null;
  liquidMonths: number | null;
  meanDaily: number | null;
  peakDayRatio: number | null;
  peakSpendSharePercent: number | null;
  totalMonthScore: number | null;
}
```

### Эндпоинты

| Метод | Путь | Параметры | Ответ |
|---|---|---|---|
| GET | `/api/analytics/dashboard` | `year`, `month` (query) | `AnalyticsDashboardDto` |
| GET | `/api/analytics/net-worth` | `from`, `to` (query, ISO date) | `NetWorthSnapshotDto[]` |
| GET | `/api/analytics/evolution` | `months` (query, число: 6, 12, или 0 = всё) | `EvolutionMonthDto[]` |
| GET | `/api/transactions` | `page=1&size=1` | `{ total: number; items: [...] }` |

---

## Specs

### `AnalyticsPage.tsx`

**Маршрут:** `/` (корень приложения)

**Данные:**

Загружается через `useQuery` (TanStack Query):

```typescript
// Ключ: ['analytics-dashboard', year, month]
const dashboardQuery = useQuery({
  queryKey: ['analytics-dashboard', selectedYear, selectedMonth],
  queryFn: () => api.get(`/analytics/dashboard?year=${year}&month=${month}`),
});

// Для онбординга — проверка наличия хоть одной транзакции
// Ключ: ['transactions-check']
const transactionsCheckQuery = useQuery({
  queryKey: ['transactions-check'],
  queryFn: () => api.get('/transactions?page=1&size=1'),
  staleTime: 30_000,
});
```

### Cache Invalidation — Analytics

Analytics queries НЕ инвалидируются вручную после каждой транзакции. Они используют staleTime:
```typescript
// Данные аналитики считаются свежими 60 секунд
useQuery({
  queryKey: queryKeys.analytics.dashboard(),
  queryFn: api.analytics.getDashboard,
  staleTime: 60_000,
})

useQuery({
  queryKey: queryKeys.analytics.netWorth(),
  queryFn: api.analytics.getNetWorth,
  staleTime: 60_000,
})
```

При необходимости принудительного обновления (например, после bulk-операций):
```typescript
// Инвалидировать всё дерево analytics:
queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() })
```

**Логика отображения:**

1. Определить `isFirstRun` из Zustand user store (`currentUser.onboardingCompleted === false && currentUser.onboardingSkipped === false`)
2. Если `isFirstRun`:
   - Пока `transactionsCheckQuery.isLoading` → показать 3 Skeleton высотой 64px
   - После загрузки → показать `<OnboardingStepper />`
3. Если не `isFirstRun`:
   - Пока `dashboardQuery.isLoading` → grid из 6 Skeleton карточек 180px высотой
   - Ошибка → глобальное error сообщение с кнопкой retry
   - Успех → полный дашборд (см. ниже)

**Навигация по месяцу:**

- Хранить выбранный месяц в локальном state: `selectedDate: Date` (первый день месяца, default = текущий)
- Кнопки «←» / «→» для перехода на месяц назад/вперёд
- Кнопка «→» задизейблена если `selectedDate` >= начало текущего месяца
- Клик на label с названием месяца открывает month picker (shadcn Popover + Calendar в режиме month)
- При смене месяца → invalidate `analytics-dashboard` query с новыми year/month

Формат label: русское название месяца + год (например, «Март 2026»). Использовать:
```typescript
new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(selectedDate)
```

**Баннер ретроспективы:**

Если выбранный месяц = предыдущий месяц (не текущий) → показывать баннер:
> «Прошлый месяц завершён. Хотите подвести итоги?»

Со ссылкой на `/reflections/{YYYY-MM}` и кнопкой закрытия. Состояние закрытия — только в локальном state (не persist).

**Вкладки:**

Две вкладки: «Сейчас» и «Динамика». Реализовать как кастомные кнопки с `role="tab"` и `aria-selected`. Не использовать shadcn Tabs (нужен кастомный стиль). При смене вкладки — только hide/show (не unmount), чтобы не терять состояние evolution tab.

**Layout дашборда (вкладка «Сейчас»):**

Отображать компоненты в следующем порядке, в CSS grid:
1. `<SummaryStrip />` — полная ширина
2. `<GlobalMonthScoreCard />` — полная ширина, содержит вложенные `<HealthScoreCard />`
3. `<SpendingPieCard />` + `<SpendingBarsCard />` — два столбца (на mobile — в столбик)
4. `<PeakDaysCard />` + `<CategoryDeltaCard />` — два столбца (на mobile — в столбик)
5. `<ForecastCard />` — полная ширина

Все props для дочерних компонентов берутся из `dashboardQuery.data` и localState.

---

### `SummaryStrip.tsx`

**Назначение:** 3 KPI-метрики в ряд — быстрый обзор финансового состояния.

**Props:**

```typescript
interface SummaryStripProps {
  loading: boolean;
  error: string | null;
  metrics: SummaryMetric[];
  onRetry: () => void;
}

type MetricAccent = 'income' | 'expense' | 'good' | 'poor' | 'neutral';

interface SummaryMetric {
  key: string;
  label: string;
  value: string;         // уже отформатированное значение (строка)
  icon: string;          // имя иконки (lucide)
  accent: MetricAccent;
  tooltip: string;
  secondary?: string;    // вторичная подпись под значением (опциональна)
}
```

**Метрики** (вычисляются в `AnalyticsPage.tsx` из `health: FinancialHealthSummaryDto`):

| key | label | Значение | accent |
|---|---|---|---|
| `savings_rate` | Норма сбережений | `savingsRate` в % (например, «23%»). Если null → «—» | good если >15%, poor если <0, иначе neutral |
| `liquid_months` | Финансовая подушка | `liquidMonths` в месяцах (например, «3.2 мес»). Null → «—» | Берётся из `liquidMonthsStatus` |
| `stability` | Стабильность расходов | `stabilityScore` (0–100, например «78 / 100»). Null → «—» | Берётся из `stabilityStatus` |

**Состояния:**
- `loading` → 3 Skeleton (40px×40px иконка + текст 14px и 28px)
- `error` → Message с кнопкой «Повторить»
- `success` → grid 3 столбца (на mobile — 1 столбец)

Каждая метрика: иконка в цветном круге (44×44px, цвет зависит от accent) + label (uppercase, small) + value (bold, tabular-nums) + secondary (small, muted).

Рядом с label — кнопка `?` (tooltip по click), min touch target 44px.

---

### `GlobalMonthScoreCard.tsx`

**Назначение:** Главная карточка месяца с общим score и набором факторных HealthScoreCard.

**Props:**

```typescript
interface GlobalMonthScoreCardProps {
  loading: boolean;
  error: string | null;
  score: number | null;            // totalMonthScore из health (0–100)
  scoreStatus: StabilityStatusCode | null;
  children?: React.ReactNode;     // слот для HealthScoreCard
  onRetry: () => void;
}
```

**Отображение score:**
- Число от 0 до 100, крупным шрифтом
- Цвет: <40 → danger (красный), 40–70 → warning (жёлтый), >70 → success (зелёный)
- Подпись под числом: «Финансовое здоровье»

**Состояния:** loading (Skeleton 128px круг + 4 Skeleton 72px), error, empty (нет данных), success.

**Empty:** когда `score === null` — показать info message «Добавьте несколько транзакций, чтобы увидеть метрики».

---

### `HealthScoreCard.tsx`

**Назначение:** Компактная карточка одного фактора здоровья (вставляется внутрь `GlobalMonthScoreCard`).

**Props:**

```typescript
interface HealthScoreCardProps {
  title: string;
  icon: string;                   // lucide icon name
  mainValue: string;              // основное значение (строка)
  mainLabel: string;              // подпись к основному значению
  secondaryValue?: string;
  secondaryLabel?: string;
  accent: MetricAccent;
  tooltip: string;
  subdued?: boolean;              // менее яркий стиль (для вложенного отображения)
}
```

Вычислить метрики в `AnalyticsPage.tsx` из `health`:

| Фактор | mainValue | mainLabel | accent |
|---|---|---|---|
| Доходы | `monthIncome` в валюте | «Доход за месяц» | income |
| Расходы | `monthTotal` в валюте | «Расходы за месяц» | expense или good/poor |
| Сбережения | `savingsRate` в % | «Норма сбережений» | по значению |
| Подушка | `liquidMonths` в мес | «Месяцев запаса» | по `liquidMonthsStatus` |

---

### `SpendingPieCard.tsx`

**Назначение:** Donut chart расходов (или доходов) по категориям с кастомной легендой.

**Props:**

```typescript
type CategoryDatasetMode = 'expenses' | 'income';
type CategoryScope = 'all' | 'mandatory' | 'discretionary';

interface SpendingPieCardProps {
  loading: boolean;
  error: string | null;
  data: CategoryBreakdownDto | null;
  currency: string;
  mode: CategoryDatasetMode;
  modeOptions: Array<{ label: string; value: CategoryDatasetMode }>;
  scope: CategoryScope;
  scopeOptions: Array<{ label: string; value: CategoryScope }>;
  onModeChange: (mode: CategoryDatasetMode) => void;
  onScopeChange: (scope: CategoryScope) => void;
  onCategorySelect: (item: CategoryBreakdownItemDto) => void;
  onRetry: () => void;
}
```

`mode` и `scope` — управляемое состояние в `AnalyticsPage.tsx`.

`modeOptions`: `[{ label: 'Расходы', value: 'expenses' }, { label: 'Доходы', value: 'income' }]`

`scopeOptions` (только для expenses mode): `[{ label: 'Все', value: 'all' }, { label: 'Обязательные', value: 'mandatory' }, { label: 'По желанию', value: 'discretionary' }]`

Данные для chart берутся из `data.items`. При `scope === 'mandatory'` — использовать `mandatoryAmount` вместо `amount`. При `scope === 'discretionary'` — `discretionaryAmount`.

**Recharts реализация:**

```tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
```

- Тип: `Pie` с `innerRadius="65%"` (donut)
- Цвета: из `item.color` (хранится в DTO)
- В центре donut — сумма total (CSS `position: absolute`, `pointer-events: none`)
- Легенда: кастомный `<ul>` под chartом (не recharts Legend), интерактивная:
  - Hover по элементу легенды → выделить соответствующий сектор (использовать `activeIndex` state)
  - Клик → вызов `onCategorySelect(item)`
  - Каждая строка: цветной кружок + name + amount (правый) + percent% (правый)
- Категория `__other__` (если items > N) — при клике раскрывает дочерние подкатегории
- `aria-label` на контейнере chart: «Круговая диаграмма расходов по категориям» / «…доходов…»

**Tooltip (кастомный):**
```tsx
const CustomTooltip = ({ active, payload }: TooltipProps<...>) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <span>{item.name}: {formatCurrency(item.value, currency)}</span>
    </div>
  );
};
```

**Состояния:** loading (Skeleton 220px круг + 4 Skeleton строки), error, empty («Добавьте расходы/доходы…»), success.

---

### `SpendingBarsCard.tsx`

**Назначение:** Bar chart расходов с выбором гранулярности (дни / недели / месяцы).

**Props:**

```typescript
type ExpenseGranularity = 'days' | 'weeks' | 'months';

interface SpendingBarsCardProps {
  loading: boolean;
  error: string | null;
  spending: SpendingBreakdownDto | null;
  currency: string;
  granularity: ExpenseGranularity;
  granularityOptions: Array<{ label: string; value: ExpenseGranularity }>;
  onGranularityChange: (g: ExpenseGranularity) => void;
  onRetry: () => void;
}
```

`granularityOptions`: `[{ label: 'По дням', value: 'days' }, { label: 'По неделям', value: 'weeks' }, { label: 'По месяцам', value: 'months' }]`

**Данные:** из `spending.days` / `spending.weeks` / `spending.months` в зависимости от `granularity`. X axis labels:
- `days`: «1», «2», … число дня (из `MonthlyExpenseDto.day`)
- `weeks`: «Нед 1», «Нед 2», … (из `week`)
- `months`: название месяца ru-RU short (из `year`+`month`)

**Recharts:**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
```

- `ResponsiveContainer width="100%" height={280}`
- Y axis: тики в валюте (`ru-RU`, без копеек)
- Показывать среднее значение как `<ReferenceLine y={average} stroke="var(--color-muted)" strokeDasharray="4 2" />`
- Если max > average * 3 (выброс): ограничить Y axis до p85 * 1.2, на выбросах рисовать метку сверху с суммой (кастомный `label` на `<Bar>`)
- Цвет бара: CSS custom property `var(--color-primary)` (не хардкодить)
- Tooltip: кастомный, показывает label + сумму в валюте

**Состояния:** loading (Skeleton 280px), error, empty, success.

---

### `PeakDaysCard.tsx`

**Назначение:** Список дней с наибольшими расходами + сводка в виде большого процента.

**Props:**

```typescript
interface PeakDaysCardProps {
  loading: boolean;
  error: string | null;
  peaks: PeakDayDto[];
  summary: PeakDaysSummaryDto;
  currency: string;
  onRetry: () => void;
  onPeakSelect: (peak: PeakDayDto) => void;
}
```

**Сводка (summary block):**

- Большой процент: `summary.sharePercent`% (или «—»)
- Подпись: «расходов в пиковые дни»
- Мета: `{summary.count} дней · {totalFormatted} из {monthTotalFormatted}`
- Цвет процента по `sharePercent`: ≤10% → success, ≤25% → warning, >25% → danger

**Список:**

- Показывать первые 3 пика по умолчанию, кнопка «Показать все ({N})»
- Каждый элемент: дата (dd MMMM, ru-RU) + сумма (tabular-nums) + «{sharePercent}% от месяца»
- Элементы — интерактивные кнопки (`onPeakSelect`)

**Tooltip на заголовке:** «Дни, когда расходы значительно превысили среднедневной уровень. Помогает выявить крупные разовые траты.»

**Состояния:** loading (1 Skeleton 60px + 2 Skeleton 44px), error, empty («Пиковых дней нет — расходы стабильны»), success.

---

### `CategoryDeltaCard.tsx`

**Назначение:** Карточка изменений расходов по категориям vs предыдущий месяц.

**Props:**

```typescript
interface CategoryDeltaCardProps {
  loading: boolean;
  error: string | null;
  periodLabel: string;              // Например, «Март 2026»
  increased: CategoryDeltaItemDto[];
  decreased: CategoryDeltaItemDto[];
  currency: string;
  onRetry: () => void;
}
```

Данные берутся из `dashboard.categories.delta`.

**Отображение:**

- Две секции: «Выросли» (increased) и «Снизились» (decreased)
- Каждая строка: цветной кружок `item.color` + name + deltaAmount в валюте + deltaPercent%
- `increased`: deltaAmount в красном (`--color-danger`)
- `decreased`: deltaAmount в зелёном (`--color-success`)
- Если обе секции пустые → empty state

---

### `ForecastCard.tsx`

**Назначение:** Line chart прогноза расходов до конца текущего месяца.

**Props:**

```typescript
interface ForecastCardProps {
  loading: boolean;
  error: string | null;
  forecast: ForecastDto | null;
  currency: string;
  isCurrentMonth: boolean;
  readinessMet: boolean;           // из dashboard.readiness.hasForecastAndStabilityData
  readinessMessage: string;        // «Недостаточно данных, продолжайте добавлять транзакции»
  observedExpenseDays: number;
  requiredExpenseDays: number;
  onRetry: () => void;
}
```

**KPI над графиком:**

- Если `isCurrentMonth && hasForecast`: label «Прогноз до конца месяца», value «{optimisticTotal} — {riskTotal}»
- Если `!isCurrentMonth`: label «Итого за месяц», value `currentSpent`
- Если есть `baselineLimit`: показать сравнение «На {diff} ({pct}%) ниже/выше базовых расходов», цвет зависит от направления (ниже = success, выше = danger)

**График (Recharts):**

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
```

- 3 линии из `forecast.series`:
  - `actual` — фактические расходы (сплошная, цвет primary)
  - `optimistic` — оптимистичный прогноз (пунктир)
  - `risk` — пессимистичный прогноз (пунктир, цвет danger)
- X axis: числа дней из `forecast.series.days`
- Если есть `baseline` — горизонтальная `<ReferenceLine y={baseline}>` с лейблом суммы
- null-значения в массивах означают разрыв линии (recharts поддерживает `connectNulls={false}`)
- Легенда под графиком: «Факт», «Коридор прогноза», «Базовые расходы» (если есть)

**Состояния:**
- `!readinessMet` → info message «{readinessMessage}. Нужны расходы минимум в {requiredExpenseDays} днях. Сейчас: {observedExpenseDays}.»
- `loading` → Skeleton заголовок + Skeleton 280px
- `error` → error message + retry
- `empty` (нет actual данных) → «Недостаточно данных для прогноза»
- `success` → KPI + график

---

### `EvolutionTab.tsx`

**Назначение:** Вкладка «Динамика» — YoY эволюция ключевых метрик по месяцам.

**Данные:**

```typescript
const evolutionQuery = useQuery({
  queryKey: ['analytics-evolution', selectedRange],
  queryFn: () => api.get(`/analytics/evolution?months=${selectedRange}`),
  staleTime: 60_000,
});
```

Загружается при первом показе вкладки (`enabled: isEvolutionTabActive`).

**Выбор периода:**

3 кнопки: «6 мес» (value: 6), «12 мес» (value: 12), «Всё» (value: 0). При смене — новый запрос.

**KPI карточки (из агрегации `EvolutionMonthDto[]`):**

Вычислить агрегаты по всем месяцам с `hasData === true`:

- **Герой-карточка** (полная ширина): средний `totalMonthScore` за период
- **4 карточки** в сетке 2×2:
  - Средняя норма сбережений (`savingsRate`)
  - Средняя стабильность (`stabilityScore`)
  - Медиана подушки (`liquidMonths`)
  - Средний % дискреционных расходов (`discretionaryPercent`)

Каждая `EvolutionKpiCard`: title + value (большое) + тренд (стрелка вверх/вниз, если можно сравнить первую и последнюю половину периода).

**Таблица по месяцам (`EvolutionMonthlyTable`):**

Столбцы (по умолчанию): Месяц | Score | Сбережения | Стабильность | Подушка | Средний день
- Месяцы в хронологическом порядке
- Строки без данных (`hasData === false`) — приглушены (opacity 0.4), ячейки = «—»
- `totalMonthScore`: цветовая кодировка <40 danger, 40–70 warning, >70 success
- `savingsRate`: >15% → success, <0% → danger
- Таблица scrollable по горизонтали на mobile

**Состояния:** loading (3 Skeleton), error (с retry), empty («Нет данных за выбранный период»), success.

---

### `OnboardingStepper.tsx`

**Назначение:** Карточка-инструкция для новых пользователей.

**Props:**

```typescript
interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
  actionLabel: string;
  actionTo: string;         // маршрут TanStack Router
}

interface OnboardingStepperProps {
  steps: OnboardingStep[];
  loading: boolean;
  onStepClick: (step: OnboardingStep) => void;
  onSkip: () => void;
}
```

**Шаги** (вычисляются в `AnalyticsPage.tsx`):

1. `categories` — «Проверьте категории» → `/categories` (обязательный, completed = локальный флаг в sessionStorage)
2. `account` — «Добавьте счёт» → `/accounts` (обязательный, completed = есть хоть один аккаунт с `isMain`)
3. `transaction` — «Добавьте транзакцию» → `/transactions` (обязательный, completed = `transactionsCheck.total > 0`)
4. `telegram` — «Подключите Telegram» → `/profile` (опциональный, completed = `currentUser.telegramUserId != null`)

**Статусы шагов:**
- `completed` → иконка ✓, приглушён (opacity 0.6), название зачёркнуто
- `current` (первый незавершённый обязательный) → показывает description + кнопку action
- `locked` (следующие обязательные) → иконка 🔒, приглушён (opacity 0.45)
- `optional` → показывает description + кнопку action, border: dashed

**Кнопка «Пропустить пока»:** вызывает `onSkip`, который устанавливает `onboardingSkipped = true` через API `PUT /users/me` и обновляет Zustand store. После этого `isFirstRun` становится false и показывается обычный дашборд.

**Layout карточки:** gradient background (primary + info mix), список шагов в сетке, каждый шаг — строка с badge (36px круг) + content + button (на mobile кнопка переносится под контент на всю ширину).

---

## Форматирование чисел

Использовать `Intl.NumberFormat` везде. Выбрасывать хелпер:

```typescript
// src/utils/formatters.ts
export function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
}
```

---

## Constraints & Best Practices

- Компоненты: функциональные, ≤200 строк — иначе декомпозировать
- Нет `any` в TypeScript
- Нет `index` как `key` в динамических списках — использовать `item.id`, `item.key`, или составной ключ
- Нет `useEffect` для fetch — только TanStack Query
- Нет дублирования серверных данных в Zustand (Zustand — только user/auth state)
- Нет хардкода цветов в Recharts — использовать `getComputedStyle(document.documentElement).getPropertyValue('--color-...')` или CSS custom properties через style attribute
- `React.memo` — только при реальной проблеме производительности
- Error boundaries на уровне `AnalyticsPage`
- Все chart контейнеры: `role="img"` + `aria-label`
- Recharts: всегда `<ResponsiveContainer>` — никогда фиксированная width в px

---

## Done When

- [ ] `GET /api/analytics/dashboard?year=&month=` загружается через `useQuery`, данные отображаются во всех компонентах
- [ ] Навигация по месяцам работает (←/→ + month picker), кнопка → задизейблена на текущем месяце
- [ ] Новый пользователь (isFirstRun) видит OnboardingStepper, кнопка «Пропустить» работает
- [ ] SummaryStrip показывает 3 метрики с правильными цветами и tooltips
- [ ] GlobalMonthScoreCard отображает score с цветовым индикатором
- [ ] SpendingPieCard: donut chart + интерактивная легенда + переключатель expenses/income + scope filter
- [ ] SpendingBarsCard: bar chart с переключателем days/weeks/months
- [ ] PeakDaysCard: список с «Показать все» и сводкой процента
- [ ] CategoryDeltaCard: две секции increased/decreased с цветами
- [ ] ForecastCard: line chart с 3 линиями, KPI, базовой линией (если есть)
- [ ] EvolutionTab (вкладка «Динамика»): загружается по требованию, 3 диапазона, KPI, таблица
- [ ] Все компоненты реализуют состояния loading / error (retry) / empty / success
- [ ] Все числа форматированы через Intl.NumberFormat('ru-RU'), даты через Intl.DateTimeFormat('ru-RU')
- [ ] Recharts использует `ResponsiveContainer`, кастомные tooltips, нет хардкода цветов
- [ ] Адаптивный layout: на mobile <640px — одна колонка
- [ ] Все интерактивные элементы: min touch target 44px
- [ ] TypeScript: нет `any`, нет неиспользуемых imports
