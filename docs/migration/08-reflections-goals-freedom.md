# Block 8 — Reflections, Goals & Freedom Calculator

> **Для AI-агента:** Этот документ — твоё единственное задание. Не смотри в vue-app/ за референсом. Используй только информацию из этого документа.

## Shared Context

- Репозиторий: monorepo, `react-app/` рядом с `vue-app/`
- Backend API base: `https://localhost:5001` (проксировать через Vite на `/api`)
- Auth: Bearer JWT в `Authorization` header, auto-refresh on 401
- Locale: ru-RU (все UI тексты, числа, даты на русском)
- Theme: dark по умолчанию (`:root`), light через `.light-mode` на `<html>`)
- Min touch target: 44px
- Breakpoints: mobile <640px, tablet <768px, desktop ≥1024px
- Financial values: `font-variant-numeric: tabular-nums`, right-aligned в таблицах
- Каждый data-driven компонент реализует все 5 состояний: idle → loading → error (с кнопкой retry) → empty → success

## Tech Stack

- React 19, TypeScript ~5.x, shadcn/ui, Tailwind CSS v4
- TanStack Router, TanStack Query v5, Zustand v5
- Axios, React Hook Form + Zod, Recharts, Vite

## Depends On

- Block 01 — Project scaffold & Vite config
- Block 02 — Design tokens & global CSS
- Block 03 — Auth & routing
- Block 04 — API client & TanStack Query setup
- Block 05 — Layout shell (sidebar, page container)

## Goal

Три раздела приложения:
1. `/reflections` + `/reflections/$month` — месячные ретроспективы с самооценкой
2. `/goals` — симуляция достижения финансовой цели (Monte Carlo)
3. `/freedom` — FIRE-калькулятор (свободные дни в году, % к FI)

---

## Specs

### TypeScript Types

```typescript
// Ретроспектива
interface RetrospectiveListItemDto {
  month: string;                      // "2025-03"
  disciplineRating: number | null;    // 1–5
  impulseControlRating: number | null;
  confidenceRating: number | null;
  conclusionPreview: string | null;   // первые ~150 символов поля conclusion
  winsPreview: string | null;
  hasContent: boolean;
}

interface RetrospectiveDto {
  month: string;
  bannerDismissedAt: string | null;
  conclusion: string | null;
  nextMonthPlan: string | null;
  wins: string | null;
  savingsOpportunities: string | null;
  disciplineRating: number | null;
  impulseControlRating: number | null;
  confidenceRating: number | null;
}

interface UpsertRetrospectivePayload {
  month: string;
  conclusion?: string | null;
  nextMonthPlan?: string | null;
  wins?: string | null;
  savingsOpportunities?: string | null;
  disciplineRating?: number | null;
  impulseControlRating?: number | null;
  confidenceRating?: number | null;
}

// Месячная аналитика (загружается на странице ретроспективы)
interface AnalyticsDashboardDto {
  health: {
    totalMonthScore: number | null;       // 0–100
    monthOverMonthChangePercent: number | null;
    stabilityActionCode: 'keep_routine' | 'smooth_spikes' | 'cap_impulse_spend' | null;
    savingsRate: number | null;           // доля, например 0.23
    netCashflow: number | null;
    stabilityScore: number | null;        // 0–100
    stabilityStatus: 'good' | 'average' | 'poor' | null;
    discretionarySharePercent: number | null;
    discretionaryTotal: number | null;
    monthTotal: number | null;
    monthIncome: number | null;
    meanDaily: number | null;
    medianDaily: number | null;
  };
  peaks: {
    count: number;
    total: number;
    sharePercent: number | null;
  } | null;
}

// Цели (симуляция)
interface GoalSimulationRequestDto {
  targetAmount: number;
  initialCapital?: number | null;
  monthlyIncome?: number | null;
  monthlyExpenses?: number | null;
  annualReturnRate?: number | null;
}

interface GoalSimulationParametersDto {
  initialCapital: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  annualReturnRate: number;
  isCapitalFromAnalytics: boolean;
  isIncomeFromAnalytics: boolean;
  isExpensesFromAnalytics: boolean;
}

interface GoalSimulationResultDto {
  probability: number;
  dataQualityScore: number;       // 0–1
  medianMonths: number;
  p25Months: number;
  p75Months: number;
  percentilePaths: {
    p25: number[];
    p50: number[];
    p75: number[];
  };
  resolvedParameters: GoalSimulationParametersDto;
  isAchievable: boolean;
  monthLabels: string[];          // ["Апрель 2025", "Май 2025", ...]
}

// Freedom calculator
interface FreedomCalculatorDefaultsDto {
  capital: number;
  monthlyExpenses: number;
}

interface FreedomCalculatorRequestDto {
  capital: number;
  monthlyExpenses: number;
  swrPercent: number;            // Safe Withdrawal Rate, например 4.0
  inflationRatePercent: number;  // например 5.0
  inflationEnabled: boolean;
}

interface FreedomCalculatorResultDto {
  freeDaysPerYear: number;         // 0–365+
  percentToFi: number;             // 0–100+
  annualPassiveIncome: number;
  annualEffectiveExpenses: number;
}
```

---

### API Endpoints

```
// Ретроспективы
GET  /api/retrospectives                        → RetrospectiveListItemDto[]
GET  /api/retrospectives/available-months       → string[]  (["2025-01", "2025-02", ...])
GET  /api/retrospectives/{month}                → RetrospectiveDto
POST /api/retrospectives (upsert)               → RetrospectiveDto
     body: UpsertRetrospectivePayload

// Аналитика месяца (используется на странице RetroDetail)
GET  /api/analytics/dashboard?month={month}     → AnalyticsDashboardDto

// Цели
GET  /api/goals/simulation/defaults             → GoalSimulationParametersDto
POST /api/goals/simulate                        → GoalSimulationResultDto
     body: GoalSimulationRequestDto

// FIRE-калькулятор
GET  /api/freedom/defaults                      → FreedomCalculatorDefaultsDto
POST /api/freedom/calculate                     → FreedomCalculatorResultDto
     body: FreedomCalculatorRequestDto
```

TanStack Query keys:
- `['retrospectives']` — список
- `['retrospectives', month]` — детальная запись
- `['retrospectives', 'available-months']` — доступные месяцы
- `['analytics', 'dashboard', month]` — аналитика месяца
- `['goal-simulation-defaults']` — defaults для целей
- `['freedom-defaults']` — defaults для FIRE

---

### ReflectionsPage (`/reflections`)

**Структура страницы:**

```
PageHeader title="Рефлексии"
  [actions slot] <Button "+ Добавить" onClick=openCreateDialog />

[Loading state]
  Скелетон: 4 прямоугольника высотой 120px

[Error state]
  Alert: "Не удалось загрузить рефлексии." + кнопка "Повторить"

[Empty state]
  Заголовок: "Пока нет рефлексий"
  Описание: "Подведите итоги любого прошедшего месяца, чтобы отслеживать свой прогресс."

[Success — есть данные]
  SelfAssessmentChart (bar chart)
  RetrospectiveList (список карточек)
```

**SelfAssessmentChart:**

Stacked BarChart (Recharts) — история самооценки по месяцам.

Данные: `RetrospectiveListItemDto[]`, отсортированные по `month` asc.

Три dataset-а:
- Дисциплина (`disciplineRating`)
- Контроль импульсов (`impulseControlRating`)
- Финансовая уверенность (`confidenceRating`)

Конфигурация:
- `stacked: true`, Y-ось: min=0, max=15 (3 метрики × max 5)
- X-метки: компактный формат месяца `toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })`
- Тогл-кнопки периода: "6 мес" | "12 мес" | "Всё" — слайсят массив с конца
- Легенда (custom): три цветных dot + label под/над chart
- Tooltip: показывает значение каждой метрики как "Метрика: X/5", footer: "Итог: N/15 (P%)"
- Нет данных → не рендерить chart
- role="img" aria-label="График истории самооценки"

**RetrospectiveCard (элемент списка):**

Кнопка (button), клик → navigate `/reflections/{month}`.

Содержимое:
- Строка 1: название месяца полное формат (`toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })`) + score badge
- Строка 2: три рейтинга через " · " с суффиксом "/5" (`X · X · X /5`). Если рейтинг null → "—"
- Строка 3 (если есть): preview текста (`winsPreview ?? conclusionPreview`)

Score badge: процент от суммы рейтингов к максимуму (3×5). Цвет:
- ≥70% — зелёный (success)
- 40–69% — жёлтый (warning)
- <40% — красный (danger)
- null → серый, текст "—"

**Диалог выбора месяца для создания:**

shadcn Dialog. Заголовок "Выберите месяц".

Содержимое:
- Загружает `GET /api/retrospectives/available-months`
- Loading: skeleton
- Error: предупреждение с текстом ошибки
- Список месяцев: Select или RadioGroup — показывать доступные месяцы
  - Месяцы, для которых уже есть запись — отображать с пометкой (например, чекмарк)
  - Формат label: `toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })`
- Validation: если не выбран → показать ошибку "Выберите месяц для рефлексии."
- Кнопка "Продолжить" → navigate `/reflections/{selectedMonth}`

---

### RetroDetailPage (`/reflections/$month`)

**Route param:** `month` — строка формата `YYYY-MM` (например `2025-03`)

**Валидация маршрута:** regex `/^\d{4}-(0[1-9]|1[0-2])$/`. Если не совпадает → redirect `/reflections`.

**Заголовок страницы:** `toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })` от месяца.

**Header actions:** кнопка "Назад" → navigate `/reflections`

**Структура страницы (блоки-карточки):**

```
Block 1: "Итоги месяца"         ← аналитика за месяц (readonly)
Block 2: "Самооценка"           ← три звёздных рейтинга (1–5)
Block 3: "Рефлексия"            ← четыре textarea
SaveBar                         ← кнопка сохранения
```

**Block 1 — Итоги месяца:**

Загружает `GET /api/analytics/dashboard?month={month}` (отдельный запрос, не мешает форме).

Loading: 5 скелетонов в сетке 2×3.
Error: предупреждение (severity=warn) — не блокирует форму.
Нет данных (null) → "Итоги за выбранный месяц пока недоступны."

При наличии данных (`AnalyticsDashboardDto`):

*Score card (общий рейтинг):*
- Большое число: `health.totalMonthScore/100` (например "72/100")
- Status label:
  - ≥80 → "Отличный месяц"
  - ≥60 → "Хороший месяц"
  - ≥40 → "Средний результат"
  - ≥20 → "Требует внимания"
  - иначе → "Критично"
- Delta badge: `health.monthOverMonthChangePercent` → формат "+X.X% к пред. месяцу". Зелёный если < 0 (расходы снизились).
- Цветовые варианты карточки: score ≥65 = good (зелёный), ≥45 = average (жёлтый), иначе = poor (красный)

*Factor cards (2×2 сетка):*
| Label | Значение | Sub-текст |
|-------|----------|-----------|
| Сбережения | `savingsRate * 100` → "X.X%" (зелёный) | `+N ₽ сохранено` если netCashflow > 0 |
| Стабильность трат | `stabilityScore/100` | `stabilityActionCode` переведённый: keep_routine="Поддерживайте ритм", smooth_spikes="Сгладьте всплески", cap_impulse_spend="Контролируйте импульсы" |
| Необязательные | `discretionarySharePercent.toFixed(1)%` | `N ₽` от discretionaryTotal |
| Расходы | `monthTotal` ₽ | `доход: N ₽` если monthIncome != null |

*Stats chips row (горизонтально):*
- "Средний день" / `meanDaily ₽` — если не null
- "Медианный день" / `medianDaily ₽` — если не null
- "Пиковые дни" / `peaks.count дн. • N ₽ • X.X%` — если peaks != null и count > 0

**Block 2 — Самооценка:**

Подзаголовок-hint: "5 — отлично, 1 — требует улучшения"

Три ряда рейтинга:

| Поле | Label | Hint |
|------|-------|------|
| disciplineRating | Дисциплина | Придерживался ли я бюджета? |
| impulseControlRating | Контроль импульсов | Избегал ли необдуманных покупок? |
| confidenceRating | Финансовая уверенность | Чувствую ли я контроль над деньгами? |

Star rating (1–5): 5 кнопок-звёзд. Звёзды от 1 до текущего значения — закрашены (primary color). Повторный клик на текущее значение → сбросить в null.

Каждая кнопка-звезда: min-width/height 44px, aria-label="Дисциплина: 3".

**Block 3 — Рефлексия:**

Четыре поля с `<textarea>`:

| id | Label | Placeholder | maxlength |
|----|-------|-------------|-----------|
| retro-wins | Что получилось? | "Придерживался бюджета, закрыл долг, отложил 20 тыс" | 1000 |
| retro-savings | Что можно было сделать лучше? | "Кафе можно было сократить до 10 тыс..." | 2000 |
| retro-conclusion | Выводы | "Не сочетать несколько крупных покупок в месяц..." | 2000 |
| retro-next-month | На следующий месяц | "Отменить ненужные подписки" | 2000 |

Под каждым textarea: счётчик символов "N / MAX" (right-aligned).

Hint под label (мелким шрифтом):
- wins: "Достижения месяца — что сделал хорошо"
- savingsOpportunities: "Конкретные покупки и суммы — это поможет вспомнить что изменить"
- conclusion: "Ключевые уроки месяца — каждый вывод с новой строки"
- nextMonthPlan: "Конкретные цели и ограничения"

**Загрузка существующей записи:**

При mount: `GET /api/retrospectives/{month}`.

Loading: скелетон.
Error: Alert "Не удалось загрузить рефлексию."
Если запись найдена → заполнить форму значениями.
Если 404 → форма пустая, режим создания.

**Сохранение:**

`POST /api/retrospectives` (upsert — создаёт или обновляет по month).

Валидация перед сохранением: хотя бы одно поле заполнено (любой рейтинг != null или хотя бы один textarea не пустой). Иначе — показать предупреждение "Заполните хотя бы одну оценку или текстовый блок."

После успешного сохранения → navigate `/reflections`.

**SaveBar:**

Кнопка "Сохранить рефлексию" (primary, min-height 44px):
- Disabled: ни одно поле не заполнено или сохранение in-flight
- Loading state: текст "Сохранение…"
- На мобильном (<640px): sticky bottom, width 100%

---

### GoalsPage (`/goals`)

**Маршрут:** `/goals`

**Структура страницы:**

```
PageHeader title="Цели"

[Loading — загрузка пользователя]
  Skeleton: 40px + 420px

[Success]
  TargetAmountInput
  GoalDetailPanel
```

**TargetAmountInput:**

- Label: `Целевая сумма ({baseCurrencyCode})`
- NumberInput: locale ru-RU, min=1, fluid width, max-width 420px
- Default value: 5 000 000
- Если ≤ 0 → Warning: "Введите целевую сумму больше нуля."

**GoalDetailPanel:**

Props: `targetAmount: number`, `currencyCode: string`

**Инициализация:** На mount → `GET /api/goals/simulation/defaults` → заполнить `GoalParametersPanel` default-значениями.

**GoalParametersPanel:**

Отображает параметры симуляции. Значения берутся из `resolvedParameters` последнего результата (если есть) или из defaults.

Поля (редактируемые overrides — если пользователь хочет переопределить автоматически подобранные):

| Поле | Label | Default source |
|------|-------|----------------|
| initialCapital | Начальный капитал | `isCapitalFromAnalytics` → badge "авто" |
| monthlyIncome | Ежемесячный доход | `isIncomeFromAnalytics` → badge "авто" |
| monthlyExpenses | Ежемесячные расходы | `isExpensesFromAnalytics` → badge "авто" |
| annualReturnRate | Годовая доходность (%) | фиксированное, например 10% |

Если поле подобрано из аналитики (`isXxxFromAnalytics === true`) → показывать badge "авто" рядом с label. Пользователь может переопределить вручную, тогда показывать кнопку "сбросить".

**Запуск симуляции:**

Кнопка "Пересчитать прогноз" (primary):
- Disabled: targetAmount <= 0, или loading, или нет pending-изменений (params не менялись с последнего расчёта)
- Loading state: показать spinner/label "Рассчитываем…"
- `POST /api/goals/simulate` → `GoalSimulationResultDto`
- Error: Alert "Не удалось выполнить симуляцию."

**KPI-результаты (показывать после первого успешного расчёта, если `isAchievable === true`):**

| KPI | Значение |
|-----|----------|
| Медианный срок | `formatDate(medianMonths)` — дата через `toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })` |
| Вероятность | `Math.round(probability * 100)%` |
| Диапазон P25–P75 | диапазон дат в хронологическом порядке |

Если `isAchievable === false` → Warning: "При текущих параметрах цель недостижима: расходы превышают доходы."

**GoalFanChartCard:**

LineChart (Recharts) с тремя линиями: p25, p50, p75 из `percentilePaths`.
- X-ось: индексы месяцев (0..N), labels из `monthLabels`
- Y-ось: сумма в валюте
- Горизонтальная линия `targetAmount` (reference line)
- Область между p25 и p75 — полупрозрачная заливка

Если loading → skeleton.
Если нет данных → hint "Нажмите «Пересчитать прогноз», чтобы запустить симуляцию."

**DataQualityBadge:**

После расчёта: показывает `dataQualityScore`:
- ≥0.95 → "Высокое качество данных" (зелёный border)
- ≥0.85 → "Среднее качество данных" (жёлтый border)
- <0.85 → "Низкое качество данных" (красный border)

С описанием: "Истории операций достаточно..." / "Прогноз может заметно меняться..." / "Истории пока мало, результат ориентировочный."

---

### FreedomCalculatorPage (`/freedom`)

**Маршрут:** `/freedom`

**Концепция:** FIRE-калькулятор — показывает, сколько "свободных дней в году" даёт текущий капитал при текущем уровне расходов. 365 дней = финансовая независимость.

**Инициализация:**
1. `GET /api/freedom/defaults` → заполнить `capital` и `monthlyExpenses` из данных пользователя
2. После загрузки defaults → сразу выполнить `POST /api/freedom/calculate` с текущими params

**Layout:**

```
PageHeader title="Калькулятор свободы"

[если defaultsError]
  Warning: "Не удалось загрузить данные. Введите значения вручную."

FreedomHeroBlock  (full width card)

Row (desktop: 360px sidebar | 1fr content):
  FreedomParametersPanel  (sidebar)
  FreedomCalendarHeatmap  (content)
```

На mobile (<1024px): column layout.

**FreedomHeroBlock:**

Loading: skeleton KPI + skeleton progress bar.

Success:

```
[Large number] freeDaysPerYear        [Percent] percentToFi%
[Label] N дней свободы в год         [Label] к финансовой независимости
                                      [Progress bar: freeDaysPerYear/365 * 100%]
```

Плюрализация дней: 1 = "день", 2–4 = "дня", остальные = "дней".
Progress fill: зелёный. При `freeDaysPerYear >= 365` → "полный" вид (primary accent color).

Empty (нет результата): "Настройте параметры для расчёта"

**FreedomParametersPanel:**

Четыре параметра. Каждый ряд:
- Label (+badge "авто" если значение из аналитики, иначе кнопка "сбросить")
- NumberInput
- Slider
- Chips быстрого ввода

| Параметр | Ед. | Slider range | Chips |
|----------|-----|-------------|-------|
| Капитал / накопления | руб | 0 – 50 000 000, step 100 000 | 1млн, 3млн, 5млн, 10млн |
| Расходы в месяц | руб | 0 – 500 000, step 1 000 | 50k, 100k, 150k, 200k |
| Безопасная ставка изъятия (SWR) | % | 1 – 10, step 0.1 | 3%, 3.5%, 4%, 4.5% |
| Инфляция (с toggle) | % | 0 – 20, step 0.5 | 3%, 5%, 7%, 10% |

Toggle "Учитывать инфляцию в расходах" (boolean):
- OFF → скрыть поле InflationRate (но оставить место toggle)
- ON → показать NumberInput + Slider + Chips для inflationRatePercent

Badge "авто" (зелёный) — если значение совпадает с defaults (разница < 1).
Кнопка "сбросить" (amber) — если пользователь изменил значение. Клик возвращает к defaults.

**Realtime пересчёт:**

`watch` изменений params → debounce 400ms → `POST /api/freedom/calculate`.

Оптимизация: не отправлять запрос если params не изменились (сравнивать по значению).

**FreedomCalendarHeatmap:**

Визуализация `freeDaysPerYear` как календарного года.

Отображает 365 ячеек (дни года, 52 недели × 7):
- Первые `freeDaysPerYear` ячеек — закрашены (primary/success color)
- Остальные — серые/dim

Показывает ощутимость результата: "У вас N свободных дней в году из 365".

Если `freeDaysPerYear >= 365` → все ячейки зелёные, сообщение "Вы финансово независимы!"

---

## Constraints & Best Practices

- Компоненты: функциональные, ≤200 строк — иначе декомпозировать
- Нет `any` в TypeScript
- Нет `index` как `key` в динамических списках — использовать `item.month` и т.д.
- Нет `useEffect` для fetch — только TanStack Query
- Нет дублирования серверных данных в Zustand
- Нет хардкода цветов
- `React.memo` — только при реальной проблеме производительности
- Error boundaries на уровне каждой страницы
- Freedom calculator: debounce + request-cancellation (не показывать stale результат если пришёл поздний ответ — использовать requestId или AbortController)
- Goals: не запускать симуляцию автоматически при изменении params — только по кнопке
- Retrospectives: сохранение по кнопке (не автосохранение), navigate после успеха
- Star rating: toggle (повторный клик сбрасывает), min touch target 44px

## Done When

- [ ] `/reflections` открывается, chart и список карточек рендерятся
- [ ] Score badge на карточках корректно окрашивается по % правилу
- [ ] Диалог выбора месяца открывается, загружает available-months, месяцы с записями отмечены
- [ ] Navigate на `/reflections/{month}` работает
- [ ] `/reflections/{month}` загружает аналитику и существующую запись (если есть)
- [ ] Форма ретроспективы: star rating toggle работает (повторный клик = null), textarea с счётчиком
- [ ] Блок "Итоги месяца" рендерит score card + 4 factor cards + stats chips
- [ ] Сохранение работает: POST → navigate /reflections
- [ ] Валидация "хотя бы одно поле" показывает предупреждение
- [ ] Невалидный month param → redirect /reflections
- [ ] `/goals` загружает defaults, GoalParametersPanel заполнена
- [ ] Симуляция запускается по кнопке, результат отображается (KPIs + Fan chart)
- [ ] dataQuality badge показывает правильный цвет
- [ ] isAchievable === false → Warning
- [ ] `/freedom` загружает defaults и сразу считает
- [ ] FreedomHeroBlock показывает freeDaysPerYear и percentToFi с progress bar
- [ ] Изменение любого параметра (debounce 400ms) → пересчёт
- [ ] Badge "авто" и кнопка "сбросить" работают корректно
- [ ] FreedomCalendarHeatmap рендерит корректное число закрашенных ячеек
- [ ] Нет TypeScript ошибок, нет ESLint warnings
