# Block 06 — Accounts & Transactions

> **Для AI-агента:** Этот документ — твоё единственное задание. Не смотри в vue-app/ за референсом. Используй только информацию из этого документа.

## Shared Context

- Репозиторий: monorepo, `react-app/` рядом с `vue-app/`
- Backend API base: `https://localhost:5001` (проксировать через Vite на `/api`)
- Auth: Bearer JWT в `Authorization` header, auto-refresh on 401
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
- Block 02 — Zustand user store (baseCurrencyCode, isReadOnlyMode)
- Block 03 — UI primitives: Card, Button, Skeleton, Badge, Dialog, ConfirmDialog, Toast
- Block 04 — PageContainer, PageHeader, EmptyState, ListToolbar

## Goal

Реализовать два раздела приложения:

1. **Счета** (`/accounts`) — управление банковскими счетами пользователя: просмотр, создание, редактирование, архивирование, корректировка баланса
2. **Транзакции** (`/transactions`) — список транзакций с фильтрацией и пагинацией; создание/редактирование транзакций и переводов

По завершении блока должны быть готовы:
- `AccountsPage.tsx` с двумя видами (активные / архивированные)
- `AccountCard.tsx` — карточка счёта с меню действий
- `AccountFormModal.tsx` — модал создания/редактирования счёта
- `AccountBalanceAdjustmentsModal.tsx` — модал корректировки баланса
- `TransactionsPage.tsx` с фильтрами и пагинацией
- `TransactionFilters.tsx` — панель фильтров
- `TransactionList.tsx` — таблица транзакций
- `TransactionFormModal.tsx` — модал создания/редактирования транзакции или перевода

---

## API

### Типы данных (TypeScript)

```typescript
// AccountType: 0 = Bank, 2 = Crypto, 3 = Brokerage, 4 = Deposit
type AccountType = 0 | 2 | 3 | 4;
type TransactionType = 'Income' | 'Expense';
type CategoryType = 'Income' | 'Expense';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface AccountDto {
  id: string;
  currencyCode: string;
  name: string;
  type: AccountType;
  isLiquid: boolean;
  isArchived: boolean;
  isMain: boolean;
  balance: number;
  balanceInBaseCurrency: number;
  currency?: Currency | null;
}

interface TransactionCategoryDto {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
  isMandatory?: boolean;
}

interface TransactionDto {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number;
  amountInBaseCurrency?: number | null;
  originalAmount?: number | null;
  originalCurrencyCode?: string | null;
  type: TransactionType;
  occurredAt: string;       // ISO 8601
  description: string | null;
  isMandatory: boolean;
  isTransfer?: boolean;
  transferId?: string | null;
}

interface PagedResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

interface AccountBalanceAdjustmentDto {
  id: string;
  accountId: string;
  amount: number;
  occurredAt: string;       // ISO 8601
}

// Payloads
interface CreateAccountPayload {
  name: string;
  type: AccountType;
  currencyCode: string;
  isLiquid?: boolean | null;
}

interface UpdateAccountPayload {
  id: string;
  name: string;
}

interface NewTransactionPayload {
  type: TransactionType;
  accountId: string;
  categoryId: string;
  amount: number;
  occurredAt: string;
  description: string | null;
  isMandatory: boolean;
}

interface UpdateTransactionPayload {
  id: string;
  type: TransactionType;
  accountId: string;
  categoryId: string;
  amount: number;
  occurredAt: string;
  description: string | null;
  isMandatory: boolean;
}

interface CreateTransferPayload {
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount: number;
  occurredAt: string;
  feeAmount?: number | null;
  description?: string | null;
}

interface UpdateTransferPayload {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount: number;
  occurredAt: string;
  feeAmount?: number | null;
  description?: string | null;
}

interface TransactionsQuery {
  accountId?: string | null;
  categoryId?: string | null;
  from?: string | null;       // YYYY-MM-DD
  to?: string | null;         // YYYY-MM-DD
  search?: string | null;
  page?: number;
  size?: number;
}
```

### Эндпоинты — Счета

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/accounts` | `AccountDto[]` |
| GET | `/api/accounts/archived` | `AccountDto[]` |
| POST | `/api/accounts` | `AccountDto` |
| PUT | `/api/accounts/{id}` | `AccountDto` |
| DELETE | `/api/accounts/{id}` | 204 |
| POST | `/api/accounts/{id}/archive` | 204 |
| POST | `/api/accounts/{id}/unarchive` | 204 |
| POST | `/api/accounts/{id}/set-primary` | 204 |
| PATCH | `/api/accounts/{id}/liquidity` | Body: `{ isLiquid: boolean }`, 204 |
| GET | `/api/accounts/{id}/balance-adjustments` | `AccountBalanceAdjustmentDto[]` |
| POST | `/api/accounts/{id}/balance-adjustments` | Body: `{ newBalance: number }`, 204 |
| DELETE | `/api/balance-adjustments/{id}` | 204 |
| GET | `/api/currencies` | `Currency[]` |

### Эндпоинты — Транзакции

| Метод | Путь | Body / Query | Ответ |
|---|---|---|---|
| GET | `/api/transactions` | query: `accountId, categoryId, from, to, search, page, size` | `PagedResult<TransactionDto>` |
| POST | `/api/transactions` | `NewTransactionPayload` | `TransactionDto` |
| PUT | `/api/transactions/{id}` | `UpdateTransactionPayload` | `TransactionDto` |
| DELETE | `/api/transactions/{id}` | — | 204 |
| POST | `/api/transfers` | `CreateTransferPayload` | `{ transferId: string }` |
| PUT | `/api/transfers/{id}` | `UpdateTransferPayload` | 200 |
| DELETE | `/api/transfers/{id}` | — | 204 |
| GET | `/api/categories` | — | `TransactionCategoryDto[]` |

---

## Specs — AccountsPage

### `AccountsPage.tsx`

**Маршрут:** `/accounts`

**Данные:**

```typescript
const accountsQuery = useQuery({
  queryKey: ['accounts'],
  queryFn: () => api.get('/accounts'),
  staleTime: 30_000,
});

const archivedAccountsQuery = useQuery({
  queryKey: ['accounts-archived'],
  queryFn: () => api.get('/accounts/archived'),
  staleTime: 30_000,
});

const currenciesQuery = useQuery({
  queryKey: ['currencies'],
  queryFn: () => api.get('/currencies'),
  staleTime: Infinity,
});
```

**Состояние страницы:**

- `view: 'active' | 'archived'` — локальный state, default `'active'`
- `searchText: string` — поиск по name / currencyCode / currency.name
- `modalOpen: boolean` — открыт ли AccountFormModal
- `editingAccount: AccountDto | null` — null = создание, иначе редактирование
- `adjustmentsAccount: AccountDto | null` — счёт для модала корректировки

**Логика отображения:**

1. Если `isReadOnlyMode` (из Zustand) — скрыть кнопку «Добавить счет», заблокировать все мутирующие действия
2. Активные счета — только `type === 0` (Bank) из `accountsQuery.data`
3. Архивированные — только `type === 0` из `archivedAccountsQuery.data`
4. Поиск: фильтрует по `account.name`, `account.currencyCode`, `account.currency?.name` (case-insensitive)
5. Сортировка: основной счёт (`isMain === true`) всегда первый, остальные по `balanceInBaseCurrency DESC`

**Skeleton:** 4 Skeleton карточки 220px высотой пока данные грузятся.

**Empty states:**
- Активные, список пуст → EmptyState: иконка wallet, «Нет активных счетов», «Добавьте банковский счет, чтобы начать отслеживать баланс и операции», кнопка «Добавить счет»
- Архивированные, список пуст → EmptyState: иконка inbox, «Архив пуст», «Здесь будут отображаться архивированные счета», кнопка «К активным счетам»
- Поиск без результатов → EmptyState: «Ничего не найдено», кнопка «Сбросить фильтры»

**Layout:**

```
PageHeader (title="Счета") [кнопка "Добавить счет" справа]
ListToolbar (tabs active/archived + search input + счётчики)
[если error] InlineError + retry
[если loading] SkeletonGrid
[если empty] EmptyState
[иначе] AccountsGrid → <AccountCard /> per account
```

Сетка карточек: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`. На mobile (<640px) — 1 колонка.

---

### `AccountCard.tsx`

**Props:**

```typescript
interface AccountCardProps {
  account: AccountDto;
  readonly?: boolean;            // true для архивированных
  interactionLocked?: boolean;   // true если isReadOnlyMode
  isPrimaryLoading?: boolean;
  isLiquidityLoading?: boolean;
  isArchiveLoading?: boolean;
  onSetPrimary: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onAdjustBalance: () => void;
  onLiquidityChange: (value: boolean) => void;
}
```

**Визуальные правила:**

- Основной счёт (`isMain === true` и `!readonly`): gradient background primary-mix
- Archived/readonly: `cursor: default`, нет hover-эффекта
- `min-height: 180px`

**Содержимое карточки:**

```
┌─────────────────────────────────────────┐
│ [Название счёта]          [⋮ Menu]       │
│ Банковский счёт                          │
│                                          │
│ {balanceInBaseCurrency} {baseCurrency}   │
│ {balance} {currencyCode}  (если разные)  │
│                                          │
│ {symbol} {code}     [Toggle] Ликвидный   │
└─────────────────────────────────────────┘
```

- `balanceInBaseCurrency`: форматировать через `formatCurrency(value, baseCurrencyCode)` — `baseCurrencyCode` берётся из Zustand user store
- Вторичный баланс (`balance` в валюте счёта) показывается только если `currencyCode !== baseCurrencyCode`
- Оба значения баланса: `font-variant-numeric: tabular-nums`
- Нижняя строка: currency display (`{symbol} {code}`) + liquidity toggle

**Меню (shadcn DropdownMenu):**

Кнопка «⋮» (icon-only, 44×44px). Пункты меню в зависимости от состояния:

| Условие | Пункты |
|---|---|
| `!readonly && !interactionLocked` | «Корректировать баланс», «Переименовать» |
| `!readonly && !interactionLocked && !account.isMain` | + «Сделать основным» |
| `!readonly && !interactionLocked && !account.isArchived` | + «Архивировать» |
| `account.isArchived` | «Разархивировать» (всегда, даже в readonly) |

Если `interactionLocked` — меню пустое, кнопка скрыта.

**Liquidity toggle:**

- В active view и не `interactionLocked`: показать `Switch` + label «Ликвидный» / «Неликвидный»
- В archived view или `interactionLocked`: показать только text label

Изменение toggle → optimistic update + `PATCH /api/accounts/{id}/liquidity`.

---

### `AccountFormModal.tsx`

**Назначение:** Создание нового счёта или переименование существующего.

**Открывается из:** `AccountsPage` при клике «Добавить счет» (editingAccount=null) или «Переименовать» (editingAccount=account).

**Props:**

```typescript
interface AccountFormModalProps {
  open: boolean;
  account: AccountDto | null;   // null = create mode
  onClose: () => void;
  onSuccess: () => void;        // вызывается после успешного сохранения
}
```

**Режим создания** (`account === null`):

Поля (React Hook Form + Zod):

```typescript
const createSchema = z.object({
  name: z.string().min(1, 'Введите название счёта').max(100),
  type: z.union([z.literal(0), z.literal(2), z.literal(3), z.literal(4)]),
  currencyCode: z.string().min(1, 'Выберите валюту'),
});
```

- `name`: TextInput, placeholder «Например, «Основная карта»», autofocus при открытии
- `type`: Select из `[{ label: 'Банк', value: 0 }, { label: 'Криптовалюта', value: 2 }, { label: 'Брокерский', value: 3 }, { label: 'Депозит', value: 4 }]`
- `currencyCode`: Select из `currenciesQuery.data`, option label = `{symbol} {code} · {name}`. По умолчанию — первая валюта из списка
- Заголовок модала: «Добавить счёт»
- Submit кнопка: «Создать» с иконкой `+`
- Submit: `POST /api/accounts` с `{ name, type, currencyCode }`

**Режим редактирования** (`account !== null`):

Поля:
```typescript
const editSchema = z.object({
  name: z.string().min(1, 'Введите название счёта').max(100),
});
```

- `name`: TextInput, предзаполнен `account.name`
- Тип и валюту не показывать (нельзя изменить после создания). Хинт: «Валюту нельзя изменить после создания.»
- Заголовок: «Переименование счета»
- Submit кнопка: «Сохранить» с иконкой ✓
- Submit: `PUT /api/accounts/{id}` с `{ name }`

**После успешного сохранения:**

```typescript
await queryClient.invalidateQueries({ queryKey: ['accounts'] });
onSuccess();
onClose();
```

**Ширина модала:** 400px, на mobile <640px — `calc(100vw - 1rem)`.

---

### `AccountBalanceAdjustmentsModal.tsx`

**Назначение:** Ввод фактического баланса счёта (корректировка). Используется когда реальный баланс расходится с рассчитанным из транзакций.

**Открывается из:** пункт меню «Корректировать баланс» на `AccountCard`.

**Props:**

```typescript
interface AccountBalanceAdjustmentsModalProps {
  open: boolean;
  account: AccountDto | null;
  readonly?: boolean;
  onClose: () => void;
}
```

**Содержимое:**

- Заголовок: «Корректировка баланса — {account.name}»
- Текущий баланс (display-only): `{account.balance} {account.currencyCode}`
- Поле «Фактический баланс»: NumberInput (валюта счёта), placeholder «Введите текущий баланс»
- Кнопка «Сохранить»: `POST /api/accounts/{id}/balance-adjustments` с `{ newBalance }`
- После успешного сохранения: `invalidate ['accounts']`, показать Toast «Баланс скорректирован»

Если `readonly === true` — блокировать форму, показать Toast при попытке отправить: «Корректировка баланса недоступна без активной подписки.»

**Валидация (Zod):**

```typescript
const schema = z.object({
  newBalance: z.number({ required_error: 'Введите баланс' }),
});
```

---

## Specs — TransactionsPage

### `TransactionsPage.tsx`

**Маршрут:** `/transactions`

**Данные:**

Параметры фильтрации хранятся в локальном state (`TransactionFiltersValue`). При изменении любого фильтра — `useQuery` с новыми параметрами (TanStack Query автоматически дедуплицирует):

```typescript
interface TransactionFiltersValue {
  dateFrom?: string;        // YYYY-MM-DD
  dateTo?: string;          // YYYY-MM-DD
  categoryId?: string;
  accountId?: string;
  search?: string;
  page: number;             // default 1
  pageSize: number;         // default 25
}

const transactionsQuery = useQuery({
  queryKey: ['transactions', filters],
  queryFn: () => api.get('/transactions', { params: { ...filters } }),
  placeholderData: keepPreviousData,  // не мигать при смене страницы
});
```

Также нужны данные для фильтров:
```typescript
const accountsQuery = useQuery({ queryKey: ['accounts'], staleTime: 30_000 });
const categoriesQuery = useQuery({ queryKey: ['categories'], staleTime: 60_000 });
```

**Layout:**

```
PageHeader (title="Транзакции") [кнопка "Добавить" справа]
[если !isReady (accounts/categories не загружены)] → 6 Skeleton строк 56px
[иначе]
  TransactionFilters
  TransactionList
```

Сначала дождаться загрузки `accountsQuery` и `categoriesQuery`, только потом показывать фильтры и список.

**Состояние модала:**

```typescript
type ModalMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit-transaction'; transaction: TransactionDto }
  | { type: 'edit-transfer'; transferId: string; payload: UpdateTransferPayload };
```

---

### `TransactionFilters.tsx`

**Props:**

```typescript
interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  onChange: (filters: Partial<TransactionFiltersValue>) => void;
  onClear: () => void;
}
```

**Элементы фильтра:**

1. **Date range picker:**
   - Две кнопки «От» и «До» (каждая открывает shadcn Popover с Calendar)
   - Формат отображения: `dd.MM.yyyy` (ru-RU)
   - Очистка: кнопка ✕ рядом с датой
   - При выборе `dateTo < dateFrom` — поменять местами автоматически

2. **Категория (Select):**
   - shadcn Select, placeholder «Все категории»
   - Опции: список категорий, сгруппированных по `type` (Доходы / Расходы)
   - Значение «— Все —» = `undefined`

3. **Счёт (Select):**
   - shadcn Select, placeholder «Все счета»
   - Опции: активные счета

4. **Поиск (Input):**
   - Текстовый input с иконкой поиска
   - Debounce 400ms перед обновлением фильтра

5. **Кнопка «Сбросить»:**
   - Показывается только если есть хоть один активный фильтр
   - Сбрасывает всё до defaults

На mobile (<640px): фильтры в accordion (свернуты по умолчанию, заголовок «Фильтры» + иконка).

---

### `TransactionList.tsx`

**Props:**

```typescript
interface TransactionListProps {
  data: PagedResult<TransactionDto> | undefined;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  loading: boolean;
  error: string | null;
  filters: TransactionFiltersValue;
  readonly?: boolean;
  onFiltersChange: (f: Partial<TransactionFiltersValue>) => void;
  onEdit: (transaction: TransactionDto) => void;
  onEditTransfer: (payload: UpdateTransferPayload) => void;
  onRetry: () => void;
}
```

**Таблица (shadcn Table):**

Строки группируются по дате (`occurredAt`): перед первой транзакцией каждого нового дня — заголовок с датой `dd MMMM yyyy` (ru-RU).

Колонки:

| # | Колонка | Выравнивание | Описание |
|---|---|---|---|
| 1 | Описание | Left | `transaction.description` или название категории. Бейдж категории (цвет + icon) |
| 2 | Счёт | Left | `account.name` (найти по `accountId` из `accounts` prop) |
| 3 | Дата | Left | `dd.MM.yyyy HH:mm` |
| 4 | Сумма | Right | `amount` в валюте счёта; color: Income = `--color-success`, Expense = `--color-danger`, Transfer = `--color-muted`; `tabular-nums` |

Дополнительно для строки:
- Перевод (`isTransfer === true`): показать иконку ↔, тип не окрашивать как Income/Expense
- Клик по строке → `onEdit(transaction)` (если не readonly и не перевод) или `onEditTransfer(...)` (если перевод)
- Кнопка удаления (иконка 🗑️, 44×44px) в конце строки, показывается при hover:
  - Для обычной транзакции: ConfirmDialog «Удалить транзакцию? Это действие нельзя отменить», при подтверждении `DELETE /api/transactions/{id}`
  - Для перевода: `DELETE /api/transfers/{transferId}`
  - После удаления: `invalidate ['transactions']`, Toast

На mobile: скрыть колонку «Счёт», дату перенести под описание мелким текстом.

**Пагинация:**

shadcn Pagination под таблицей. Props:
- `page`: текущая страница (из filters)
- `pageSize`: размер страницы (25 по умолчанию)
- `total`: из `data.total`
- При смене страницы → `onFiltersChange({ page: newPage })`

Показывать: «Показано {from}–{to} из {total}».

**Итого:**

Над таблицей (или под фильтрами) — суммарная строка расходов за отфильтрованный период (если фильтр по датам задан): «Итого расходов: {сумма} {валюта}». Если фильтр не задан — не показывать.

**Состояния:**
- `loading` → 8 Skeleton строк 56px высотой
- `error` → error message + «Повторить»
- `empty` (нет транзакций при активных фильтрах) → «Ничего не найдено» + «Сбросить фильтры»
- `empty` (нет транзакций вообще) → EmptyState «Транзакций пока нет», кнопка «Добавить первую транзакцию»
- `success` → таблица + пагинация

---

### `TransactionFormModal.tsx`

**Назначение:** Создание/редактирование транзакции или перевода между счетами.

**Props:**

```typescript
interface TransactionFormModalProps {
  open: boolean;
  mode:
    | { type: 'create' }
    | { type: 'edit-transaction'; transaction: TransactionDto }
    | { type: 'edit-transfer'; payload: UpdateTransferPayload };
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  readonly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Две вкладки в модале:** «Транзакция» | «Перевод».

Для edit-transaction → вкладка «Транзакция» активна и зафиксирована. Для edit-transfer → вкладка «Перевод» активна и зафиксирована. Для create → обе вкладки доступны.

---

#### Вкладка «Транзакция»

**Схема (Zod):**

```typescript
const transactionSchema = z.object({
  transactionType: z.enum(['Income', 'Expense']),
  amount: z.number({ required_error: 'Введите сумму' }).positive('Сумма должна быть больше 0'),
  occurredAt: z.string().min(1, 'Выберите дату'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  accountId: z.string().min(1, 'Выберите счёт'),
  description: z.string().max(500).nullable().optional(),
  isMandatory: z.boolean().default(false),
});
```

**Поля:**

1. **Тип** (income/expense): SegmentedControl с двумя кнопками «Доход» / «Расход». Влияет на список категорий.

2. **Сумма**: NumberInput, min 0.01, шаг 0.01, валюта отображается рядом (берётся из выбранного счёта)

3. **Дата**: DatePicker (shadcn Calendar + Popover), default = сегодня. Не позволять выбрать будущие даты.

4. **Категория**: Select, фильтруется по `transactionType`:
   - `Income` → только `category.type === 'Income'`
   - `Expense` → только `category.type === 'Expense'`
   - Option: цветной кружок + icon + name

5. **Счёт**: Select из активных (не архивированных) счетов. Option: name + balance + currencyCode

6. **Описание**: Textarea, optional, max 500 символов, placeholder «Комментарий (необязательно)»

7. **Обязательный платёж** (`isMandatory`): Checkbox / Toggle. Подсказка: «Обязательные расходы (аренда, кредит и т.д.) учитываются отдельно в аналитике»

**Submit:**
- Create: `POST /api/transactions`
- Edit: `PUT /api/transactions/{id}`
- После успеха: `invalidate ['transactions']`, `invalidate ['accounts']` (баланс изменился), Toast «Транзакция сохранена»

---

#### Вкладка «Перевод»

**Назначение:** Перевод средств между двумя счетами пользователя.

**Схема (Zod):**

```typescript
const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'Выберите счёт списания'),
  toAccountId: z.string().min(1, 'Выберите счёт зачисления'),
  fromAmount: z.number().positive('Сумма должна быть больше 0'),
  toAmount: z.number().positive('Сумма должна быть больше 0'),
  occurredAt: z.string().min(1, 'Выберите дату'),
  feeAmount: z.number().min(0).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
}).refine(
  (data) => data.fromAccountId !== data.toAccountId,
  { message: 'Счета должны различаться', path: ['toAccountId'] }
);
```

**Поля:**

1. **Счёт списания** (`fromAccountId`): Select из активных счетов
2. **Сумма списания** (`fromAmount`): NumberInput. Рядом — код валюты выбранного `fromAccount`
3. **Счёт зачисления** (`toAccountId`): Select из активных счетов (исключить `fromAccountId` из опций)
4. **Сумма зачисления** (`toAmount`): NumberInput. Если валюта совпадает с `fromAccount` → автоматически равна `fromAmount` (синхронизировать через `watch`). Если разная — вводится вручную.
5. **Дата**: DatePicker, default = сегодня
6. **Комиссия** (`feeAmount`): NumberInput, optional, default null
7. **Описание**: Textarea, optional

**Submit:**
- Create: `POST /api/transfers`
- Edit: `PUT /api/transfers/{transferId}`
- После успеха: `invalidate ['transactions']`, `invalidate ['accounts']`, Toast «Перевод сохранён»

---

### Мутации (TanStack Query)

Использовать `useMutation` для всех изменяющих операций:

```typescript
// Пример паттерна для архивирования
const archiveMutation = useMutation({
  mutationFn: (id: string) => api.post(`/accounts/${id}/archive`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['accounts-archived'] });
    toast({ title: 'Счет архивирован', description: 'Счет перемещен в архив.' });
  },
  onError: () => {
    toast({ title: 'Ошибка', description: 'Не удалось архивировать счет.', variant: 'destructive' });
  },
});
```

Аналогично для: setPrimary, unarchive, updateLiquidity, deleteTransaction, deleteTransfer.

**ConfirmDialog перед архивацией:**

```
«Архивировать счет "{account.name}"?
Счет будет скрыт из активных операций, но история сохранится.»
[Отмена] [Архивировать]
```

---

## Вспомогательные функции

```typescript
// Человекочитаемое название типа счёта
function getAccountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    0: 'Банковский счёт',
    2: 'Криптовалюта',
    3: 'Брокерский счёт',
    4: 'Депозит',
  };
  return labels[type] ?? 'Счёт';
}

// Иконка типа счёта (lucide icon name)
function getAccountTypeIcon(type: AccountType): string {
  const icons: Record<AccountType, string> = {
    0: 'building-2',      // bank
    2: 'bitcoin',          // crypto
    3: 'trending-up',     // brokerage
    4: 'piggy-bank',      // deposit
  };
  return icons[type] ?? 'wallet';
}
```

---

## Constraints & Best Practices

- Компоненты: функциональные, ≤200 строк — иначе декомпозировать
- Нет `any` в TypeScript
- Нет `index` как `key` в динамических списках — использовать `account.id`, `transaction.id`
- Нет `useEffect` для fetch — только TanStack Query
- Нет дублирования серверных данных в Zustand (Zustand — только user/auth state)
- Нет хардкода цветов — CSS custom properties через Tailwind CSS v4 tokens
- `React.memo` — только при реальной проблеме производительности
- Error boundaries на уровне каждой страницы (`AccountsPage`, `TransactionsPage`)
- Формы: React Hook Form + Zod, нет ручного управления состоянием полей
- Все модалы: закрытие по Escape, клик вне модала (dismissable)
- Все мутации через `useMutation` с `onSuccess` → `invalidateQueries`
- Toast уведомления для всех успешных и ошибочных мутаций
- `placeholderData: keepPreviousData` в `transactionsQuery` — не мигать при смене страницы/фильтра

---

## Done When

- [ ] `GET /api/accounts` загружается, список активных счетов отображается в карточках
- [ ] `GET /api/accounts/archived` загружается, переключение active/archived работает
- [ ] Поиск по счетам фильтрует в реальном времени (debounce 300ms)
- [ ] AccountCard отображает: name, тип, balance в base currency + в валюте счёта (если разные), DropdownMenu с правильными пунктами, liquidity toggle
- [ ] Основной счёт (`isMain`) — всегда первый, с визуальным выделением
- [ ] AccountFormModal создаёт новый счёт (POST) с полями name + type + currency
- [ ] AccountFormModal переименовывает существующий (PUT), валюта недоступна для изменения
- [ ] После сохранения в модале → `invalidate ['accounts']`, модал закрыт
- [ ] Архивация: ConfirmDialog, после подтверждения — `POST archive`, `invalidate`, Toast
- [ ] Разархивация: доступна в archived view, без confirm, Toast
- [ ] Установка основного счёта: `POST set-primary`, `invalidate`, Toast
- [ ] AccountBalanceAdjustmentsModal: вводит фактический баланс, `POST balance-adjustments`, `invalidate ['accounts']`
- [ ] `GET /api/transactions` с фильтрами, пагинацией, `placeholderData: keepPreviousData`
- [ ] TransactionFilters: date range (два отдельных picker), category select, account select, search с debounce
- [ ] TransactionList: строки сгруппированы по дате, колонки description/account/date/amount, сумма с цветом Income/Expense
- [ ] Строки-переводы (`isTransfer`) отображаются корректно, открывают transfer edit modal
- [ ] Удаление транзакции: ConfirmDialog + `DELETE /api/transactions/{id}` + Toast
- [ ] Удаление перевода: ConfirmDialog + `DELETE /api/transfers/{id}` + Toast
- [ ] Пагинация работает, отображается «Показано X–Y из Z»
- [ ] TransactionFormModal (вкладка Транзакция): все поля, RHF + Zod валидация, create и edit режимы
- [ ] TransactionFormModal (вкладка Перевод): fromAccount/toAccount (не равны), fromAmount/toAmount (синхронизация если одна валюта), create и edit режимы
- [ ] После сохранения транзакции: `invalidate ['transactions', 'accounts']`, Toast
- [ ] `isReadOnlyMode` из Zustand — блокирует все кнопки действий на AccountsPage и TransactionsPage
- [ ] Адаптивный layout: на mobile <640px — одна колонка карточек, фильтры в accordion, таблица без колонки счёта
- [ ] Все интерактивные элементы: min touch target 44px
- [ ] TypeScript: нет `any`, нет неиспользуемых imports
