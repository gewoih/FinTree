# UI/UX Audit — План исправлений (v2)

> Первичный аудит: 15.02.2026 по инструкциям из CLAUDE.md.
> Ревалидация: 15.02.2026 — Playwright (Chrome) + код-анализ через 3 параллельных агента.
> Приоритеты: P0 — критические, P1 — высокие, P2 — средние, P3 — минорные.

---

## Сводка статусов

| # | Задача | Статус | Комментарий |
|---|--------|--------|-------------|
| P0-1 | Bottom Tab Bar | **DONE** | `BottomTabBar.vue` создан, 5 items, `<nav>`, `aria-current` |
| P0-2 | Chart colors → CSS-переменные | **DONE** | `useChartColors.ts` composable, все 7 компонентов мигрированы |
| P0-3 | Touch targets 44px | **PARTIAL** | Кнопки 44px, но HeroHealthCard metric icons 36/30px |
| P0-4 | `--ft-orange-400` | **DONE** | Токен добавлен в `design-tokens.css` (строка 77) |
| P1-1 | `tabular-nums` | **OPEN** | Только `TransactionList.vue`, 7+ компонентов без |
| P1-2 | Tooltips на термины | **PARTIAL** | HeroHealthCard, SpendingPieCard имеют, остальные нет |
| P1-3 | Нестандартные токены | **OPEN** | `AccountsPage.vue`: 4 инстанса `--surface-0`/`--primary` |
| P1-4 | Responsive overflow | **OPEN** | Analytics: 610px overflow на 360px viewport |
| P2-1 | ARIA на controls | **PARTIAL** | Частичное улучшение |
| P2-2 | Loading `aria-live` | **OPEN** | 3 компонента без aria-live |
| P2-3 | Breadcrumbs семантика | **OPEN** | `<div>` вместо `<nav>`, нет `aria-current`/`aria-hidden` |
| P2-4 | Modal autofocus | **PARTIAL** | AccountFormModal + TransactionForm имеют, 2 без |
| P3-1 | Hardcoded dimensions | **OPEN** | Не начато |
| P3-2 | Decorative `aria-hidden` | **OPEN** | LandingPage — множество иконок без |
| P3-3 | AppCard → UiCard | **OPEN** | AppCard используется в 7+ файлах |
| P3-4 | Fallback-цвета `var()` | **DONE** | HeroHealthCard без fallback hex |

---

## DONE — Исправлено

### P0-1. Bottom Tab Bar ✅

**Проверено через Playwright**: `BottomTabBar.vue` создан и интегрирован в `AppShell.vue`.
- Виден на 360px, скрыт на 1280px
- 5 nav items: Главная, Транзакции, Счета, Инвестиции, Профиль
- `<nav>` с `aria-label="Основная навигация"`
- `aria-current="page"` на активном элементе

### P0-2. Chart colors → CSS-переменные ✅

- Composable `useChartColors.ts` создан в `vue-app/src/composables/`
- Читает CSS-токены через `getComputedStyle`, обновляется при смене темы через MutationObserver
- Все chart-компоненты мигрированы: AnalyticsPage, NetWorthLineCard, ForecastCard, SpendingBarsCard, SpendingPieCard, InvestmentsPage
- Hardcoded hex только как fallback в самом composable (допустимый паттерн)
- ProfilePage — hardcoded цвета убраны

### P0-4. `--ft-orange-400` ✅

Токен определён в `design-tokens.css` (строка 77): `--ft-orange-400: #FB923C`.
Используется в `--ft-chart-4: var(--ft-orange-400)` и HeroHealthCard.

### P3-4. Fallback-цвета `var()` ✅

HeroHealthCard использует `var(--ft-*)` без fallback hex-значений.

---

## OPEN — Требует работы

### P0-3 (partial). HeroHealthCard metric icons < 44px

**Статус**: Все кнопки исправлены до 44px, но metric icons остались 36×36px (desktop) / 30×30px (mobile).

**Файл**: `HeroHealthCard.vue`
- Строки 534-535: `width: 36px; height: 36px`
- Строки 769-770: `width: 30px; height: 30px` (mobile breakpoint)

**Замечание**: Иконки имеют `cursor: help` и `v-tooltip` — являются интерактивными (tooltip по hover/tap).

**Что сделать**: Увеличить до `min-width: 44px; min-height: 44px` с сохранением визуального размера иконки внутри.

---

### P1-1. Добавить `font-variant-numeric: tabular-nums`

**Статус**: OPEN — только `TransactionList.vue` использует

**Затрагиваемые файлы**:

| Файл | CSS-класс |
|------|-----------|
| `SummaryStrip.vue` | `.summary-strip__value` |
| `HeroHealthCard.vue` | `.hero-card__metric-value`, `.hero-card__peak-share-value` |
| `AccountCard.vue` | `.account-card__balance-main`, `.account-card__balance-secondary` |
| `InvestmentAccountCard.vue` | `.investment-card__balance`, `.investment-card__return` |
| `CategoryDeltaCard.vue` | `.delta-item__delta` |
| `SpendingPieCard.vue` | `.donut-card__legend-amount` |
| `ForecastCard.vue` | `.forecast-chip__value` |
| `AccountBalanceAdjustmentsModal.vue` | `.adjustments-list__amount` |

**Что сделать**: Добавить `font-variant-numeric: tabular-nums;` в CSS каждого класса.

---

### P1-2. Tooltips на финансовые термины

**Статус**: PARTIAL — HeroHealthCard и SpendingPieCard имеют tooltips, остальные нет

**Затрагиваемые файлы**:

| Файл | Термин | Что написать в tooltip |
|------|--------|----------------------|
| `AccountCard.vue` | "Доступность" | "Можно ли быстро снять деньги без потерь. Быстрый доступ — наличные, карта. Долгосрочный — вклад, инвестиции." |
| `TransactionForm.vue` | "Обязательный расход" | "Расходы, которые нельзя избежать: аренда, коммуналка, кредиты. Влияет на расчёт финансовой устойчивости." |
| `InvestmentAccountCard.vue` | "Доходность" | "Сколько вы заработали или потеряли на этой инвестиции в процентах." |
| `SummaryStrip.vue` | Все метрики | Каждый label должен иметь tooltip |

**Что сделать**: PrimeVue `v-tooltip` + визуальный индикатор (dotted underline или иконка info).

---

### P1-3. Нестандартные CSS-токены

**Статус**: OPEN — 4 инстанса в `AccountsPage.vue`

| Файл | Строка | Текущее | Замена |
|------|--------|---------|--------|
| `AccountsPage.vue` | 424 | `var(--surface-0)` | `var(--ft-surface-base)` |
| `AccountsPage.vue` | 453 | `var(--primary)` | `var(--ft-primary-500)` |
| `AccountsPage.vue` | 457 | `var(--primary)` | `var(--ft-primary-500)` |
| `AccountsPage.vue` | 476 | `var(--surface-0)` | `var(--ft-surface-base)` |

---

### P1-4. Responsive overflow на Analytics (360px)

**Статус**: OPEN — критический overflow

**Проверено через Playwright** (viewport 360×800):
- **Analytics**: overflow **610px** vs 345px (критический)
- **Investments**: overflow **350px** vs 345px (5px, минорный)
- **Transactions**: нет overflow ✅
- **Accounts**: нет overflow ✅

**Вероятные причины на Analytics**:
- Summary strip (3 карточки в строку) не сворачивается
- Hero health cards grid с `minmax(300px, 380px)`
- Forecast chips горизонтальный layout

**Что сделать**: Исследовать DOM на 360px, найти элемент-источник overflow, добавить responsive breakpoints.

---

### P2-1. ARIA на интерактивных элементах

**Статус**: PARTIAL

| Файл | Проблема |
|------|----------|
| `SpendingPieCard.vue` | Legend items `role="button"` без `aria-label` (строка 221) |
| `PeakDaysCard.vue` | Summary button без `aria-label` (строка 126) |
| `CategoryFormModal.vue` | Icon grid items без `aria-label` (строки 326-343) |
| `UiSkeleton.vue` | Нет `role="status"` / `aria-busy="true"` |

---

### P2-2. Loading states — `aria-live` regions

**Статус**: OPEN — есть в AppShell, FormField, FinancialHealthSummaryCard; отсутствует в:
- `HeroHealthCard.vue`
- `SpendingBarsCard.vue`
- `CategoryManager.vue`

**Что сделать**: Обернуть loading-контейнеры в `<div role="status" aria-live="polite">`.

---

### P2-3. Breadcrumbs — семантическая навигация

**Статус**: OPEN

**Файл**: `PageHeader.vue`, строки 12-39

**Текущее**:
- `<div class="page-header__breadcrumbs">` — нет `<nav>`
- Нет `aria-label="Навигация"`
- Нет `aria-current="page"` на текущем элементе
- Разделители `<i class="pi pi-chevron-right">` без `aria-hidden="true"`

**Что сделать**:
- `<div>` → `<nav aria-label="Навигация">`
- Добавить `aria-current="page"` на последний breadcrumb
- Добавить `aria-hidden="true"` на разделители

---

### P2-4. Modal autofocus

**Статус**: PARTIAL

| Файл | Статус |
|------|--------|
| `AccountFormModal.vue` | `:autofocus="props.visible"` ✅ |
| `TransactionForm.vue` | `autofocus` ✅ |
| `TransferFormModal.vue` | Нет autofocus ❌ |
| `CategoryFormModal.vue` | Нет autofocus ❌ |

---

### P3-1. Hardcoded dimensions → tokens

**Статус**: OPEN

| Файл | Что | Замена |
|------|-----|--------|
| `EmptyState.vue` | `min-height: 400px`, Icon `80×80px` | Оставить или prop |
| `HealthScoreCard.vue` | Icon `40×40px` | `var(--ft-control-height)` |
| `PageHeader.vue` | Separator `0.75rem` | `var(--ft-space-3)` |

---

### P3-2. Decorative icons — `aria-hidden="true"`

**Статус**: OPEN

**LandingPage.vue** — множество `<i class="pi pi-*">` без `aria-hidden="true"`:
- `pi-chart-bar` (логотип)
- `pi-lock`, `pi-times-circle`, `pi-check-circle` (trust section)
- Feature icons, FAQ chevrons
- `pi-arrow-down` (scroll indicator)

---

### P3-3. AppCard → UiCard

**Статус**: OPEN — AppCard используется в 7 файлах

| Файл |
|------|
| `LandingPage.vue` |
| `CategoryManager.vue` |
| `OnboardingStepper.vue` |
| `TermsPage.vue` |
| `PrivacyPolicyPage.vue` |
| `CareersPage.vue` |
| `BlogPage.vue` |

**Что сделать**: Проверить совместимость API, заменить все использования, удалить `AppCard.vue`.

---

## Общие метрики по завершении

| Метрика | Текущее | Цель |
|---------|---------|------|
| Hardcoded hex/rgb в JS chart-компонентов | 0 ✅ | 0 |
| PrimeVue-токены (`--surface-*`, `--primary`) | 4 | 0 |
| Touch targets < 44px | 2 (metric icons) | 0 |
| Financial amounts без `tabular-nums` | 7 компонентов | 0 |
| Financial terms без tooltip | ~4 компонента | 0 |
| Горизонтальный overflow на 360px | 2 страницы | 0 |
| `role="button"` без `aria-label` | 1 компонент | 0 |
| Decorative `<i>` без `aria-hidden` | ~10 иконок | 0 |
| Loading без `aria-live` | 3 компонента | 0 |
| Breadcrumbs без `<nav>` | 1 компонент | 0 |
| Модалки без autofocus | 2 | 0 |
| AppCard дубликат | 7 файлов | 0 |

---

## Порядок выполнения

```
Фаза 1 — Quick wins (~20 мин):
  P1-1 (tabular-nums)            — 8 файлов, добавить CSS-свойство
  P1-3 (токены AccountsPage)     — 4 замены в 1 файле
  P0-3 (HeroHealthCard icons)    — 2 строки CSS

Фаза 2 — Responsive (~30 мин):
  P1-4 (Analytics overflow 360px) — исследование + fix

Фаза 3 — Accessibility (~45 мин):
  P2-3 (Breadcrumbs <nav>)       — PageHeader.vue
  P2-4 (Modal autofocus)         — 2 модалки
  P2-1 (ARIA labels)             — 4 компонента
  P2-2 (aria-live loading)       — 3 компонента

Фаза 4 — Polish (~40 мин):
  P3-2 (aria-hidden icons)       — LandingPage + другие
  P1-2 (Tooltips на термины)     — 4 компонента, написание текстов
  P3-3 (AppCard → UiCard)        — 7 файлов
  P3-1 (hardcoded dimensions)    — 3 файла
```