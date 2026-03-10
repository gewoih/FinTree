# Block 7 — Categories & Investments

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
- Block 06 — Accounts & Transactions

## Goal

Две страницы приложения:
1. `/categories` — управление категориями транзакций (create/edit/delete)
2. `/investments` — обзор инвестиционного портфеля (инвест-счета, сводка, аллокация, история капитала)

---

## Specs

### TypeScript Types

```typescript
// Тип категории
type CategoryType = 1 | 2; // 1 = Income, 2 = Expense

interface TransactionCategoryDto {
  id: string;
  name: string;
  color: string;        // hex, например "#4CAF50"
  icon: string;         // класс иконки, например "pi-tag"
  type: CategoryType;
  isMandatory?: boolean;
}

// Category с полем usageCount (для отображения в списке)
interface Category extends TransactionCategoryDto {
  usageCount?: number;
}

// Инвестиционный счёт (из overview)
interface InvestmentAccountOverviewDto {
  id: string;
  name: string;
  currencyCode: string;
  type: number;          // AccountType: 2=Broker, 3=Crypto, 4=RealEstate
  isLiquid: boolean;
  balance: number;
  balanceInBaseCurrency: number;
  lastAdjustedAt: string | null;
  returnPercent: number | null;
}

interface InvestmentsOverviewDto {
  periodFrom: string;
  periodTo: string;
  totalValueInBaseCurrency: number;
  liquidValueInBaseCurrency: number;
  totalReturnPercent: number | null;
  accounts: InvestmentAccountOverviewDto[];
}
```

---

### API Endpoints

```
GET  /api/categories                   → TransactionCategoryDto[]
GET  /api/categories/with-usage-count  → Category[]   (с полем usageCount)
POST /api/categories                   → TransactionCategoryDto
     body: { name, color, icon, categoryType: CategoryType, isMandatory: boolean }
PUT  /api/categories/{id}              → TransactionCategoryDto
     body: { name, color, icon, categoryType: CategoryType, isMandatory: boolean }
DELETE /api/categories/{id}            → 204

GET /api/investments/overview          → InvestmentsOverviewDto
GET /api/accounts/net-worth            → NetWorthSnapshotDto[]
     (массив { year, month, netWorth })
```

TanStack Query keys:
- `['categories']` — для GET /categories/with-usage-count
- `['investments-overview']` — для GET /investments/overview
- `['net-worth']` — для GET /accounts/net-worth

После мутаций (create/update/delete) вызывать `queryClient.invalidateQueries({ queryKey: ['categories'] })`.

---

### CategoriesPage (`/categories`)

**Маршрут:** `/categories`

**Структура страницы:**

```
PageHeader title="Категории"
  [actions slot] <Button "Новая категория" icon=Plus onClick=openCreateModal />

[Loading state]
  Скелетон: 4 прямоугольника grid-auto-fit(260px, 1fr) высотой 120px

[Error state — нет данных]
  Alert variant=destructive: "Не удалось загрузить категории."
  <Button "Повторить" onClick=retry />

[Inline error — данные есть, но обновление упало]
  Alert variant=warning над контентом: "Не удалось обновить..." + кнопка "Повторить"

[Success]
  ToggleGroup (Расходы | Доходы) — фильтрует список
  CategoryGrid:
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))
    CategoryCard для каждой категории отфильтрованного типа

[Empty — нет категорий в выбранном типе]
  EmptyState: иконка + "Нет категорий" + кнопка "Создать категорию"
```

**CategoryCard:**

Кликабельная карточка (button role), при клике открывает `CategoryFormModal` в режиме Edit.

Содержимое карточки:
- Цветная точка (`background-color: category.color`, 14px, circle)
- Иконка (class="pi {category.icon}", если нет — "pi-tag")
- Название категории (`category.name`)
- Бейдж "Обязательная" если `category.isMandatory === true`
- Шеврон-стрелка вправо

Disabled-состояние: карточка не кликабельна в read-only режиме.

**CategoryFormModal (shadcn Dialog):**

Открывается как модальный диалог (max-width 560px).

Два режима:
- **Create:** заголовок "Новая категория", кнопка "Создать"
- **Edit:** заголовок "Категория", кнопка "Сохранить"

**Поля формы (React Hook Form + Zod):**

```typescript
const categorySchema = z.object({
  name: z.string().min(1, "Введите название категории."),
  categoryType: z.union([z.literal(1), z.literal(2)]), // только при создании
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Используйте формат #RRGGBB."),
  icon: z.string().min(1),
  isMandatory: z.boolean(),
});
```

Поля UI:
1. **Название** — text input, placeholder "Например, «Транспорт»", required
2. **Тип** — ToggleGroup (Доход | Расход), только при создании (в Edit-режиме не показывать и не менять)
3. **Иконка** — кастомный picker:
   - Кнопка-триггер показывает текущую иконку
   - При клике открывает grid с preset-иконками (radiogroup)
   - Клик вне grid-а закрывает picker
   - Preset-иконки для расходов: pi-tag, pi-shopping-cart, pi-car, pi-home, pi-utensils, pi-heart, pi-bolt, pi-book, pi-plane, pi-gift, pi-wifi, pi-credit-card
   - Для доходов: pi-tag, pi-briefcase, pi-chart-bar, pi-wallet, pi-dollar, pi-building
4. **Цвет** — `<input type="color">` + text input для HEX (`#RRGGBB`); оба синхронизированы
5. **Обязательная категория** — Checkbox (только для расходных категорий). Влияет на аналитику устойчивости.

Кнопки в footer:
- "Создать" / "Сохранить" — submit, disabled пока форма invalid или мутация in-flight
- В Edit-режиме: секция "Опасная зона" с кнопкой удаления (icon trash, variant=destructive)

**Удаление категории:**

При нажатии кнопки удаления — ConfirmDialog (shadcn AlertDialog):
- Заголовок: "Удаление категории"
- Сообщение: `Удалить категорию "{name}"? Все транзакции будут перенесены в «Без категории».`
- Кнопки: "Отмена" | "Удалить" (variant=destructive)
- После подтверждения: `DELETE /api/categories/{id}`, invalidate `['categories']`, закрыть модал

---

### InvestmentsPage (`/investments`)

**Маршрут:** `/investments`

**Загрузка данных:**

```typescript
// Параллельно на mount:
useQuery(['investments-overview'])  // GET /api/investments/overview
useQuery(['accounts'])              // GET /api/accounts (активные счета)
useQuery(['accounts', 'archived'])  // GET /api/accounts/archived
useQuery(['net-worth'])             // GET /api/accounts/net-worth
```

Инвестиционные типы счетов: `AccountType 2` (Broker), `3` (Crypto), `4` (RealEstate).
Страница фильтрует эти типы из общего списка счетов.

**Структура страницы:**

```
PageHeader title="Инвестиции"

SummaryStrip (3 KPI-карточки, full width)

[если есть активные счета]
  Row: InvestmentsAllocationPie (50%) | NetWorthBarChart (50%)

InvestmentsAccountsSection (full width)
```

**SummaryStrip — 3 KPI:**

| KPI | Источник данных |
|-----|----------------|
| Капитал | Сумма `balanceInBaseCurrency` всех активных инвест-счетов |
| Ликвидная часть | Сумма `balanceInBaseCurrency` активных счетов где `isLiquid === true` |
| Доходность | `overview.totalReturnPercent * 100` → форматировать как `"+X.X%"` |

Состояния KPI: loading (skeleton), error (встроенный retry), success.

Доходность: цвет значения — зелёный если > 0, красный если < 0, нейтральный если null.

**InvestmentsAllocationPie:**

PieChart (Recharts) — распределение по счетам.
- Данные: `activeAccounts.map(a => ({ name: a.name, value: a.balanceInBaseCurrency }))`
- Каждый сектор: свой цвет из palette
- Легенда: список названий счетов с цветными dot-ами и суммами в базовой валюте
- role="img" aria-label="Распределение инвестиционного портфеля"
- Нет данных → не рендерить компонент

**NetWorthBarChart:**

BarChart (Recharts) — история капитала по месяцам.
- Данные из `GET /api/accounts/net-worth` → `NetWorthSnapshotDto[]`
- Сортировать по year asc, month asc
- X-ось: метки месяцев `toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })`
- Y-ось: значения в базовой валюте
- Bar цвет: primary brand color
- role="img" aria-label="История капитала"

**InvestmentsAccountsSection:**

Таб-переключатель "Активные | Архивные".
Поиск по имени / коду валюты (text input, фильтрует локально).

Для каждого счёта — карточка:
- Название счёта
- Тип (Broker / Crypto / RealEstate — перевести на ru-RU)
- Баланс в валюте счёта
- Баланс в базовой валюте (tabular-nums)
- Доходность (`returnPercent`): зелёный/красный/серый, формат "+X.X%"
- Переключатель "Ликвидный" (toggle) — disabled в архивном режиме или read-only
- Кнопки: "Редактировать" (открывает AccountFormModal), "Архивировать" / "Разархивировать"

Архивация: ConfirmDialog — "Архивировать счет "{name}"? Он будет исключен из активных метрик, но история сохранится."

Empty state активной вкладки (нет ни одного инвест-счёта):
- "У вас пока нет инвестиционных счетов"
- Кнопка "Добавить счёт"

Empty state архивной вкладки:
- "Нет архивных счетов"

**AccountFormModal** (переиспользовать из Block 06, ограничить `allowedTypes=[2,3,4]`)

**AccountBalanceAdjustmentsModal** — модал для ручной корректировки баланса инвестиционного счёта:
- Список корректировок с датой и суммой
- Форма: дата + сумма + кнопка "Добавить"
- API: `GET /api/accounts/{id}/balance-adjustments`, `POST /api/accounts/{id}/balance-adjustments`

---

## Constraints & Best Practices

- Компоненты: функциональные, ≤200 строк — иначе декомпозировать
- Нет `any` в TypeScript
- Нет `index` как `key` в динамических списках — использовать `category.id` / `account.id`
- Нет `useEffect` для fetch — только TanStack Query
- Нет дублирования серверных данных в Zustand
- Нет хардкода цветов — только CSS-переменные или Tailwind-токены
- `React.memo` — только при реальной проблеме производительности
- Error boundaries на уровне каждой страницы
- Формы: React Hook Form + Zod
- Все confirm-диалоги: shadcn AlertDialog (не нативный `window.confirm`)
- Icon picker: закрывается по клику вне (mousedown listener на document)
- Color picker: `<input type="color">` и text input синхронизированы через `watch` RHF или `onChange`

## Done When

- [ ] `/categories` открывается, показывает список категорий с переключением Расходы/Доходы
- [ ] Создание категории: форма валидируется, POST выполняется, список обновляется
- [ ] Редактирование категории: форма заполнена текущими данными, PUT выполняется
- [ ] Удаление категории: ConfirmDialog → DELETE → список обновляется
- [ ] Иконка-пикер открывается/закрывается, выбранная иконка отображается на карточке
- [ ] Color picker синхронизирует visual swatch и text input
- [ ] `/investments` открывается, SummaryStrip показывает KPI
- [ ] Pie chart и Bar chart рендерятся при наличии данных
- [ ] Список счетов фильтруется по поиску и табу Активные/Архивные
- [ ] Liquidity toggle, архивация/разархивация работают
- [ ] Все 5 состояний (idle/loading/error/empty/success) реализованы на обеих страницах
- [ ] Нет TypeScript ошибок, нет ESLint warnings
