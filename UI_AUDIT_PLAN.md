# UI/UX Audit — План исправлений

> Аудит проведён 15.02.2026 по инструкциям из CLAUDE.md (раздел "UI/UX Design System").
> Приоритеты: P0 — критические (ломают UX/a11y), P1 — высокие, P2 — средние, P3 — минорные.

---

## P0 — Критические

### P0-1. Добавить Bottom Tab Bar для мобильной навигации

**Проблема**: На экранах <1024px навигация реализована через Drawer (бургер-меню). Пользователь не видит разделы без открытия меню — низкая discoverability, 2 тапа вместо 1 для перехода.

**Текущее состояние**: `AppShell.vue` — desktop sidebar + mobile Drawer. Bottom tab bar компонента не существует.

**Что сделать**:
- Создать компонент `BottomTabBar.vue` в `components/layout/`
- Фиксированная панель внизу экрана с 4-5 основными nav items (Главная, Транзакции, Счета, Инвестиции, Профиль)
- Показывать только на <1024px, скрывать на desktop
- Интегрировать в `AppShell.vue` вместо Drawer для основной навигации
- Drawer можно оставить для дополнительных действий или убрать

**Затрагиваемые файлы**:
- `vue-app/src/components/layout/AppShell.vue` — интеграция
- Новый: `vue-app/src/components/layout/BottomTabBar.vue`
- `vue-app/src/assets/design-tokens.css` — добавить `--ft-bottom-bar-height: 64px`

**Критерии приёмки**:
- [ ] Bottom bar видим на экранах <1024px, скрыт на ≥1024px
- [ ] Содержит 4-5 nav items с иконками и подписями
- [ ] Активный пункт визуально выделен (цвет + фон)
- [ ] Touch targets ≥44px на каждый item
- [ ] `role="navigation"`, `aria-label="Основная навигация"` на контейнере
- [ ] `aria-current="page"` на активном пункте
- [ ] Main content имеет `padding-bottom` равный высоте bar чтобы контент не перекрывался
- [ ] Safe area (iPhone notch) учтена через `env(safe-area-inset-bottom)`
- [ ] Z-index: `--ft-z-sticky` (1020)
- [ ] Нет горизонтального overflow на 360px

---

### P0-2. Заменить hardcoded цвета в Chart-компонентах на CSS-переменные

**Проблема**: Chart.js получает hex-литералы вместо значений из CSS-переменных. В light mode графики отображаются некорректно — тёмные цвета на светлом фоне не контрастируют, tooltip-фоны не переключаются.

**Текущее состояние**: Компоненты используют `getComputedStyle().getPropertyValue()` с hardcoded fallback-значениями. Fallback-и — тёмные цвета (light mode palette), которые становятся основными если CSS-переменная не найдена.

**Затрагиваемые файлы и строки**:

| Файл | Строки | Hardcoded значения |
|------|--------|-------------------|
| `AnalyticsPage.vue` | 73-77 | `'#2e5bff'`, `'#0ea5e9'`, `'#22c55e'`, `'#a855f7'`, `'#f59e0b'`, `'#283449'`, `'#0b111a'` |
| `AnalyticsPage.vue` | 498 | `'rgba(255,255,255,0.8)'` border color |
| `AnalyticsPage.vue` | 660 | `'#f97316'` forecast risk line |
| `NetWorthLineCard.vue` | 24-29, 34-39 | `'#1e293b'`, `'rgba(148,163,184,0.2)'`, `'#f1f5f9'`, `'#94a3b8'`, `'#334155'` |
| `ForecastCard.vue` | 23-25, 30-32 | `'#1e293b'`, `'rgba(148,163,184,0.2)'` |
| `ForecastCard.vue` | 527-528 | `#f97316` в CSS (risk line legend) |
| `SpendingBarsCard.vue` | 26-29, 34-37 | `'#1e293b'`, `'rgba(148,163,184,0.2)'`, `'#0ea5e9'`, `'#0b111a'` |
| `SpendingPieCard.vue` | 59, 76, 94-100 | `'#1e293b'`, `'#0b111a'`, `'#f1f5f9'`, `'#94a3b8'`, `'#334155'` |
| `InvestmentsPage.vue` | 149 | `'#6B82DB'` backgroundColor |
| `ProfilePage.vue` | 709 | `'#000'` в CSS gradient |

**Что сделать**:
- Создать composable `useChartColors()` который читает CSS-переменные через `getComputedStyle` и реактивно обновляется при смене темы
- Маппинг: `textColor` → `--ft-text-primary`, `gridColor` → `--ft-border-subtle`, `tooltipBg` → `--ft-surface-raised`, `tooltipTitle` → `--ft-text-primary`, `tooltipBody` → `--ft-text-secondary`, `tooltipBorder` → `--ft-border-default`, `accentColor` → `--ft-primary-400`, `surfaceBase` → `--ft-bg-base`
- Добавить в `design-tokens.css` токены для chart palette: `--ft-chart-1` через `--ft-chart-5` (с переопределением в `.light-mode`)
- Заменить hardcoded hex в CSS (`ForecastCard:527-528`, `ProfilePage:709`) на `var(--ft-warning-400)` и `var(--ft-bg-base)` соответственно

**Критерии приёмки**:
- [ ] Ноль hex/rgb литералов в JS-коде chart-компонентов (кроме fallback внутри `useChartColors`)
- [ ] Ноль hardcoded цветов в `<style>` секциях chart-компонентов
- [ ] Графики корректно отображаются в dark mode
- [ ] Графики корректно отображаются в light mode
- [ ] При переключении темы цвета графиков обновляются без перезагрузки
- [ ] Chart palette токены (`--ft-chart-1`...`--ft-chart-5`) определены в `design-tokens.css` для обеих тем

---

### P0-3. Увеличить touch targets до 44px minimum

**Проблема**: Множество интерактивных элементов имеют размер <44px. На мобильных устройствах пользователи промахиваются, особенно при частых действиях (закрытие модалок, переключение месяцев).

**Затрагиваемые файлы и строки**:

| Файл | Элемент | Текущий размер | Строки CSS |
|------|---------|---------------|------------|
| `AccountBalanceAdjustmentsModal.vue` | Close button | 36×36px | 286-304 |
| `TransferFormModal.vue` | Close button | 36×36px | 532-555 |
| `CategoryFormModal.vue` | Close button | 36×36px | 468-488 |
| `TransactionFilters.vue` | Clear button | 36×36px | 164-183 |
| `AccountCard.vue` | Icon buttons | 40×40px | 307-310 |
| `InvestmentAccountCard.vue` | Menu trigger | 32×32px | 209-210 |
| `HeroHealthCard.vue` | Metric icon | 34×34px | 534-535 |
| `AnalyticsPage.vue` | Month selector buttons | ~6px (padding: 0.2rem) | 896 |

**Что сделать**: В каждом файле заменить `width`/`height`/`min-height` на минимум `44px` (или `var(--ft-control-height)`). Для icon buttons — увеличить clickable area, сохранив визуальный размер иконки.

**Критерии приёмки**:
- [ ] Все интерактивные элементы имеют `min-width: 44px` и `min-height: 44px`
- [ ] Визуально кнопки не выглядят чрезмерно большими (увеличить clickable area, не иконку)
- [ ] Month selector в AnalyticsPage удобен для тапа одной рукой
- [ ] Проверено на мобильном (360px) — все кнопки легко нажимаются

---

### P0-4. Несуществующий токен `--ft-orange-400`

**Проблема**: `HeroHealthCard.vue` ссылается на `--ft-orange-400` (строки 685, 697) который не определён в `design-tokens.css`. Используется fallback `#fb923c`.

**Что сделать**: Заменить `--ft-orange-400` на `--ft-warning-400` (#FBBF24) или добавить orange palette в токены, если оранжевый нужен отдельно от warning.

**Затрагиваемые файлы**:
- `vue-app/src/components/analytics/HeroHealthCard.vue` — строки 685, 697

**Критерии приёмки**:
- [ ] Все CSS-переменные существуют в `design-tokens.css`
- [ ] Нет fallback-hex в `var()` вызовах (кроме обоснованных случаев)

---

## P1 — Высокие

### P1-1. Добавить `font-variant-numeric: tabular-nums` на все финансовые суммы

**Проблема**: Цифры в суммах имеют пропорциональную ширину — при обновлении данных или в таблицах колонки "прыгают". Для финансового приложения это маркер непрофессионализма.

**Текущее состояние**: Только `TransactionList.vue` использует `tabular-nums`. Все остальные компоненты с суммами — нет.

**Затрагиваемые файлы** (CSS-классы, которым нужен `font-variant-numeric: tabular-nums`):

| Файл | CSS-класс |
|------|-----------|
| `SummaryStrip.vue` | `.summary-strip__value` |
| `HeroHealthCard.vue` | `.hero-card__metric-value`, `.hero-card__peak-share-value` |
| `AccountCard.vue` | `.account-card__balance-main`, `.account-card__balance-secondary` |
| `InvestmentAccountCard.vue` | `.investment-card__balance`, `.investment-card__return` |
| `CategoryDeltaCard.vue` | `.delta-item__delta` |
| `SpendingPieCard.vue` | `.donut-card__legend-amount` |
| `ForecastCard.vue` | `.forecast-chip__value` |
| `NetWorthLineCard.vue` | Tooltip values (в chart config) |
| `SpendingBarsCard.vue` | Tooltip values (в chart config) |
| `AccountBalanceAdjustmentsModal.vue` | `.adjustments-list__amount` |

**Что сделать**: Добавить `font-variant-numeric: tabular-nums;` в CSS каждого перечисленного класса. Альтернативно — создать utility class `.ft-tabular-nums` в `style.css` и применить в шаблонах.

**Критерии приёмки**:
- [ ] Все денежные суммы в приложении используют tabular-nums
- [ ] Колонки цифр визуально выровнены
- [ ] Суммы не "прыгают" при обновлении данных

---

### P1-2. Добавить tooltips на финансовые термины

**Проблема**: Целевая аудитория (25-35 лет, низкая финграмотность) не понимает финансовые термины. CLAUDE.md требует tooltip на каждый термин.

**Затрагиваемые файлы**:

| Файл | Термин | Строки | Что написать в tooltip |
|------|--------|--------|----------------------|
| `AccountCard.vue` | "Доступность" (ликвидность) | 184-206 | "Можно ли быстро снять деньги без потерь. Быстрый доступ — наличные, карта. Долгосрочный — вклад, инвестиции." |
| `TransactionForm.vue` | "Обязательный расход" | 458-475 | "Расходы, которые нельзя избежать: аренда, коммуналка, кредиты. Влияет на расчёт финансовой устойчивости." |
| `HeroHealthCard.vue` | Метрики без описания | Проверить все метрики | Каждая метрика должна иметь tooltip с пояснением на простом русском |
| `InvestmentAccountCard.vue` | "Доходность" | Блок return | "Сколько вы заработали или потеряли на этой инвестиции в процентах." |
| `SummaryStrip.vue` | Все метрики | Value labels | Каждый label должен иметь tooltip |

**Что сделать**: Использовать PrimeVue `v-tooltip` directive с текстом на простом русском (1-2 предложения, без жаргона). Добавить визуальный индикатор (иконка `(i)` или пунктирное подчёркивание) что tooltip доступен.

**Критерии приёмки**:
- [ ] Каждый финансовый термин в UI имеет tooltip
- [ ] Tooltip текст на простом русском, без жаргона
- [ ] Tooltip доступен с клавиатуры (focus trigger)
- [ ] Визуальный индикатор наличия tooltip (иконка info или dotted underline)
- [ ] На мобильном tooltip показывается по тапу

---

### P1-3. Заменить нестандартные CSS-токены на `--ft-*`

**Проблема**: В компонентах используются PrimeVue-токены (`--surface-0`, `--primary`) вместо `--ft-*`. При кастомизации или смене темы они могут не обновиться.

**Затрагиваемые файлы и строки**:

| Файл | Строка | Текущее | Замена на |
|------|--------|---------|-----------|
| `AccountsPage.vue` | 424 | `var(--surface-0)` | `var(--ft-surface-base)` |
| `AccountsPage.vue` | 453 | `var(--primary)` | `var(--ft-primary-500)` |
| `AccountsPage.vue` | 457 | `var(--primary)` | `var(--ft-primary-500)` |
| `AccountsPage.vue` | 476 | `var(--surface-0)` | `var(--ft-surface-base)` |
| `AppShell.vue` | 229 | `--app-shell-nav-height: 72px` | Перенести в `design-tokens.css` как `--ft-nav-height: 72px` |
| `AppShell.vue` | 332, 366 | `font-size: 1.5rem` | `font-size: var(--ft-text-2xl)` |
| `AppShell.vue` | 410 | `font-size: 1.25rem` | `font-size: var(--ft-text-xl)` |
| `AppShell.vue` | 419 | `font-size: 1.3rem` | `font-size: var(--ft-text-xl)` |
| `AppShell.vue` | 455 | `rgb(15 23 42 / 22%)` | `var(--ft-shadow-lg)` или добавить токен |
| `AppShell.vue` | 463-464 | `min-height: 44px; padding: 0.7rem 0.85rem` | `min-height: var(--ft-control-height); padding: var(--ft-space-3) var(--ft-space-3)` |
| `AnalyticsPage.vue` | 879 | `gap: 0.4rem` | `gap: var(--ft-space-1)` |
| `AnalyticsPage.vue` | 882 | `padding: 0.25rem 0.5rem` | `padding: var(--ft-space-1) var(--ft-space-2)` |
| `AnalyticsPage.vue` | 896 | `padding: 0.2rem` | `padding: var(--ft-space-2)` (+ увеличить для touch target) |

**Критерии приёмки**:
- [ ] Поиск по `var(--surface`, `var(--primary)` (без `ft-` префикса) — 0 результатов в `vue-app/src/`
- [ ] Поиск hardcoded rem/px в spacing (кроме `border-width`, `outline`, `box-shadow offset`) — 0 результатов
- [ ] Все custom CSS properties компонентов перенесены в `design-tokens.css`
- [ ] Визуальная регрессия отсутствует

---

### P1-4. Исправить responsive overflow на малых экранах

**Проблема**: На viewport 360-639px некоторые компоненты вызывают горизонтальный скролл.

**Затрагиваемые файлы**:

| Файл | Проблема | Строки |
|------|----------|--------|
| `TransactionFilters.vue` | 5-колоночный grid с min-width суммарно ~550px — overflow на 360-640px | 128 |
| `HeroHealthCard.vue` | `minmax(300px, 380px)` второй колонки — сжимает первую до <260px | 378 |
| `UiDataTable.vue` | `min-width: 760px` на таблице — всегда горизонтальный скролл на мобильном | 72 |

**Что сделать**:
- `TransactionFilters.vue`: добавить промежуточный breakpoint (768px) с 2-колоночным layout
- `HeroHealthCard.vue`: уменьшить min-width второй колонки до 240px или переключать на 1 колонку раньше
- `UiDataTable.vue`: обернуть таблицу в `.table-shell__body` с `overflow-x: auto` (уже есть) + убедиться что parent не блокирует overflow

**Критерии приёмки**:
- [ ] На 360px экране нет горизонтального скролла ни на одной странице
- [ ] На 640px экране все фильтры и сетки удобны
- [ ] Таблицы на мобильном имеют горизонтальный скролл только внутри своего контейнера, не на уровне body

---

## P2 — Средние

### P2-1. Добавить ARIA атрибуты на form controls

**Проблема**: Ui-обёртки (`UiInputText`, `UiSelect`, `UiDatePicker`) не пробрасывают `aria-label` / `aria-describedby`. Screen reader не может идентифицировать назначение полей без visible label.

**Что сделать**: Проверить что `useAttrs()` + `v-bind="attrs"` корректно пробрасывают aria-атрибуты. Если нет — добавить explicit props.

**Дополнительные ARIA-проблемы**:

| Файл | Проблема | Строки |
|------|----------|--------|
| `SpendingPieCard.vue` | Legend items с `role="button"` без `aria-label` | 230-234 |
| `PeakDaysCard.vue` | Summary button без `aria-label` | 124-128 |
| `CategoryFormModal.vue` | Icon grid items без `aria-label` | 326-343 |
| `UiSkeleton.vue` | Нет `role="status"` / `aria-busy="true"` | Весь компонент |

**Критерии приёмки**:
- [ ] Все `role="button"` элементы имеют `aria-label`
- [ ] `UiSkeleton` имеет `role="status"` и screen-reader-only текст "Загрузка..."
- [ ] Form controls доступны через screen reader с понятным описанием

---

### P2-2. Loading states — добавить `aria-live` regions

**Проблема**: Skeleton loading отображается визуально, но screen reader не анонсирует начало/окончание загрузки.

**Затрагиваемые файлы**:
- `HeroHealthCard.vue` — loading skeleton без aria-live
- `SpendingBarsCard.vue` — loading skeleton без aria-live
- `CategoryManager.vue` — loading skeleton без aria-live
- `AnalyticsPage.vue` — initial load без skeleton

**Что сделать**: Обернуть loading-контейнеры в `<div role="status" aria-live="polite">`. При переходе из loading → success screen reader анонсирует "Данные загружены".

**Критерии приёмки**:
- [ ] Каждый loading state обёрнут в `aria-live="polite"` region
- [ ] Screen reader анонсирует начало загрузки
- [ ] Нет избыточных анонсов (не более 1 на загрузку секции)

---

### P2-3. Breadcrumbs — семантическая навигация

**Проблема**: `PageHeader.vue` рендерит breadcrumbs в `<div>`, а не в `<nav aria-label="Навигация">`. Текущий элемент не имеет `aria-current="page"`.

**Файл**: `vue-app/src/components/common/PageHeader.vue`, строки 14-39

**Что сделать**:
- Заменить `<div class="page-header__breadcrumbs">` на `<nav aria-label="Навигация" class="page-header__breadcrumbs">`
- Добавить `aria-current="page"` на последний (текущий) breadcrumb
- Добавить `aria-hidden="true"` на разделители (`pi-chevron-right`)

**Критерии приёмки**:
- [ ] Breadcrumbs обёрнуты в `<nav aria-label="Навигация">`
- [ ] Текущая страница имеет `aria-current="page"`
- [ ] Разделители имеют `aria-hidden="true"`

---

### P2-4. Modal autofocus на первый интерактивный элемент

**Проблема**: При открытии модалок фокус не перемещается на первое поле ввода. Keyboard users должны табать через весь DOM.

**Затрагиваемые файлы**:

| Файл | Текущее | Нужно |
|------|---------|-------|
| `TransferFormModal.vue` | Нет autofocus | Добавить autofocus на первый input |
| `CategoryFormModal.vue` | Нет autofocus | Добавить autofocus на InputText (название) |
| `AccountFormModal.vue` | Есть autofocus ✓ | Эталон — использовать как образец |

**Критерии приёмки**:
- [ ] При открытии каждой модалки фокус на первом интерактивном элементе
- [ ] При закрытии фокус возвращается на элемент, который открыл модалку

---

## P3 — Минорные

### P3-1. Hardcoded dimensions → tokens

**Проблема**: Ряд компонентов используют raw px для размеров вместо токенов или хотя бы rem.

| Файл | Что | Строки | Замена |
|------|-----|--------|--------|
| `EmptyState.vue` | `min-height: 400px` | 66 | Оставить или вынести в prop |
| `EmptyState.vue` | Icon `80px × 80px` | 78-79 | Оставить или сделать responsive через clamp |
| `NetWorthLineCard.vue` | Chart `height: 350px` | 258 | Оставить (chart canvas фиксирован) |
| `HealthScoreCard.vue` | Icon `40px × 40px` | 103-104 | `var(--ft-control-height)` если кликабельный |
| `PageHeader.vue` | Separator `0.75rem` | 99 | `var(--ft-space-3)` |
| `HealthScoreCard.vue` | `gap: 2px` | 141, 199 | `gap: 1px` или убрать |

**Критерии приёмки**:
- [ ] Interactive elements используют `--ft-control-height` или `--ft-space-*`
- [ ] Декоративные элементы могут использовать px если обоснованно

---

### P3-2. Decorative icons — добавить `aria-hidden="true"`

**Затрагиваемые файлы**:

| Файл | Строки | Иконка |
|------|--------|--------|
| `LandingPage.vue` | 240-242 | Trust section icons (`pi-lock`, etc.) |
| `TransactionList.vue` | 528 | Transfer icon (`pi-arrow-right-arrow-left`) |
| `AnalyticsPage.vue` | 729, 745 | Month selector chevrons |

**Что сделать**: Добавить `aria-hidden="true"` на каждую декоративную иконку.

**Критерии приёмки**:
- [ ] Grep по `class="pi pi-` без `aria-hidden` на той же строке — 0 результатов (декоративные)
- [ ] Информативные иконки (без текстового label) имеют `aria-label`

---

### P3-3. Удалить `AppCard`, унифицировать с `UiCard`

**Проблема**: `LandingPage.vue` использует `AppCard` — дубликат `UiCard`.

**Что сделать**: Проверить `AppCard` — если функционально идентичен `UiCard`, заменить все использования и удалить файл.

**Критерии приёмки**:
- [ ] Один компонент карточки (`UiCard`) во всём приложении
- [ ] `AppCard.vue` удалён (если дубликат)

---

### P3-4. HeroHealthCard — fallback-цвета в CSS `var()`

**Проблема**: `HeroHealthCard.vue` содержит множество `var(--ft-*, #hex)` с fallback-значениями (строки 423-697). Это не ошибка, но засоряет код и создаёт иллюзию что токены могут отсутствовать.

**Что сделать**: Убрать fallback-значения из `var()`. Если токен определён в `design-tokens.css`, fallback не нужен.

**Критерии приёмки**:
- [ ] Все `var(--ft-*, #hex)` заменены на `var(--ft-*)` без fallback
- [ ] Визуальная регрессия отсутствует (токены корректно определены)

---

## Общие метрики по завершении

| Метрика | Цель |
|---------|------|
| Hardcoded hex/rgb в JS | 0 (кроме fallback в useChartColors) |
| Hardcoded hex/rgb в CSS | 0 (кроме border-width, outline) |
| PrimeVue-токены (`--surface-*`, `--primary`) | 0 |
| Touch targets < 44px | 0 |
| Financial amounts без `tabular-nums` | 0 |
| Financial terms без tooltip | 0 |
| Горизонтальный overflow на 360px | 0 страниц |
| `role="button"` без `aria-label` | 0 |
| Decorative `<i>` без `aria-hidden` | 0 |

---

## Порядок выполнения

```
Фаза 1 (P0):  P0-2 → P0-3 → P0-4 → P0-1
               (цвета → touch targets → токен → bottom bar)
               Цвета и touch targets — быстрые правки с большим эффектом.
               Bottom bar — новый компонент, делать последним в фазе.

Фаза 2 (P1):  P1-1 → P1-3 → P1-2 → P1-4
               (tabular-nums → токены → tooltips → responsive)
               tabular-nums — 10 мин, глобальный эффект.
               Tooltips — требуют написания текстов, делать после.

Фаза 3 (P2):  P2-3 → P2-4 → P2-1 → P2-2
               (breadcrumbs → modal focus → ARIA → loading)
               Breadcrumbs и focus — быстрые правки.

Фаза 4 (P3):  P3-2 → P3-1 → P3-3 → P3-4
               (aria-hidden → dimensions → AppCard → fallbacks)
```
