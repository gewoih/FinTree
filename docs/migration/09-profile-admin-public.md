# Block 9 — Profile, Admin & Public Pages

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
- Block 07 — Categories (CategoryManager переиспользуется на ProfilePage)

## Goal

Три группы страниц:
1. **ProfilePage** (`/profile`) — настройки, подписка, категории (табы)
2. **AdminPage** (`/admin`) — только для owner, метрики сервиса
3. **Публичные страницы** — Landing, Login, Register, PrivacyPolicy, Terms, Blog, Careers

---

## Specs

### TypeScript Types

```typescript
interface CurrentUserDto {
  id: string;
  name: string;
  email: string | null;
  telegramUserId: number | null;
  registeredViaTelegram: boolean;
  baseCurrencyCode: string;
  subscription: SubscriptionInfoDto;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  isOwner: boolean;
}

interface SubscriptionInfoDto {
  isActive: boolean;
  isReadOnlyMode: boolean;
  expiresAtUtc: string | null;
  monthPriceRub: number;
  yearPriceRub: number;
}

type SubscriptionPlan = 'Month' | 'Year';
type SubscriptionPaymentStatus = 'Succeeded' | 'Failed' | 'Refunded' | 'Canceled';

interface SubscriptionPaymentDto {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionPaymentStatus;
  listedPriceRub: number;
  chargedPriceRub: number;
  billingPeriodMonths: number;
  grantedMonths: number;
  isSimulation: boolean;
  paidAtUtc: string;
  subscriptionStartsAtUtc: string;
  subscriptionEndsAtUtc: string;
  provider: string | null;
  externalPaymentId: string | null;
}

interface UpdateUserProfilePayload {
  baseCurrencyCode: string;
  telegramUserId: number | null;
}

// Admin
interface AdminKpisDto {
  totalUsers: number;
  activeSubscriptions: number;
  activeSubscriptionsRatePercent: number;
  onboardingCompletedUsers: number;
  onboardingCompletionRatePercent: number;
  totalAccounts: number;
  totalTransactions: number;
  transactionsLast30Days: number;
}

interface AdminUserSnapshotDto {
  userId: string;
  email: string | null;
  name: string;
  isOwner: boolean;
  hasActiveSubscription: boolean;
  isOnboardingCompleted: boolean;
  isTelegramLinked: boolean;
  transactionsCount: number;
  lastTransactionAtUtc: string | null;
}

interface AdminOverviewDto {
  kpis: AdminKpisDto;
  users: AdminUserSnapshotDto[];
}
```

---

### API Endpoints

```
GET    /api/users/me                     → CurrentUserDto
PUT    /api/users/me                     → CurrentUserDto
       body: UpdateUserProfilePayload
GET    /api/users/me/subscription/payments → SubscriptionPaymentDto[]
POST   /api/users/me/subscription/pay    → SubscriptionInfoDto
       body: { plan: SubscriptionPlan }
GET    /api/currencies                   → CurrencyDto[]
       (используется для списка базовых валют)

GET    /api/admin/overview               → AdminOverviewDto
```

TanStack Query keys:
- `['current-user']`
- `['subscription-payments']`
- `['currencies']`
- `['admin-overview']`

---

### ProfilePage (`/profile`)

**Маршрут:** `/profile`

**Layout:** Табы в верхней части страницы (role=tablist):
- "Настройки" (иконка шестерёнка)
- "Категории" (иконка тегов)

При смене таба — контент показывается/скрывается (не перегружается).

---

#### Таб "Настройки"

**Карточка "Админ-панель"** (только если `currentUser.isOwner === true`):

Описание: "Просматривайте ключевые метрики сервиса: пользователей, транзакции и операционную активность."
Кнопка "Открыть админ-панель" → navigate `/admin`

---

**Карточка Identity (readonly, muted variant):**

- Аватар: инициалы из `name` (первая буква имени + первая буква фамилии, если есть; иначе первые две буквы)
- Имя: `currentUser.name`
- Email: `currentUser.email ?? "—"`

---

**Карточка "Основные настройки":**

Форма (React Hook Form + Zod):

```typescript
const settingsSchema = z.object({
  baseCurrencyCode: z.string().min(1, "Выберите валюту."),
  telegramUserId: z.string().nullable(), // строка для input, null если пустое
});
```

**Поля:**

1. **Базовая валюта** — Select из `GET /api/currencies`. Option label: `{code} — {name}`. Hint: "В этой валюте считается вся аналитика и отчёты". Disabled в read-only режиме или пока currencies загружаются.

2. **Telegram-бот** — text input с placeholder "123456789". Рядом — кнопка "Очистить" (ghost, sm), disabled если поле пустое или saving/read-only.
   Hint: `Отправьте /id боту @financetree_bot и вставьте цифры сюда. Оставьте пустым, чтобы отвязать.`

**Кнопки:**
- "Сбросить" (ghost) — disabled если нет изменений, сбрасывает форму к current user data
- "Сохранить" (primary, icon checkmark) — disabled если нет изменений или форма невалидна; loading во время мутации

`PUT /api/users/me` с `{ baseCurrencyCode, telegramUserId: parsedNumber | null }`.
После успеха: invalidate `['current-user']`.

Read-only режим: `currentUser.subscription.isReadOnlyMode === true` → форма disabled, Save disabled.

---

**Карточка "Подписка" (outlined variant):**

Заголовок + статус-бейдж ("Активна" зелёный / "Только просмотр" жёлтый).

Если активна:
- "Активна до {expiresAtUtc в формате ru-RU toLocaleDateString}"

Если неактивна:
- "Доступен только просмотр"

Два тарифных плана (карточки):
- **Месяц** — `{subscription.monthPriceRub} ₽ / в месяц`
- **Год** — `{subscription.yearPriceRub} ₽ / в год`

Кнопка "Оплатить" на каждом плане:
- Loading если мутация in-flight
- Disabled если мутация in-flight или подписка уже активна

`POST /api/users/me/subscription/pay` с `{ plan }` → invalidate `['current-user']`.

Примечание (мелким шрифтом): "Сейчас оплата имитируется: при нажатии «Оплатить» выдается бесплатный доступ на 1 месяц."

---

**Карточка "История оплат" (muted, collapsible):**

Заголовок + счётчик платежей (badge) + иконка chevron для expand/collapse.

По умолчанию свёрнута.

При раскрытии — загружает `GET /api/users/me/subscription/payments`.

Loading: 3 skeleton строки.
Empty: "Оплат пока нет. Когда вы нажмёте «Оплатить», запись появится здесь."

Список платежей. Для каждого:
- Строка 1: `{planLabel} · {statusLabel}` — plan: Month="Месяц", Year="Год"; status: Succeeded="Оплачено", Failed="Ошибка", Refunded="Возврат", Canceled="Отменено"
- Строка 2: дата оплаты (`paidAtUtc` → `toLocaleString('ru-RU')`) + `Период: {billingPeriodMonths} мес.`
- Правая колонка: `Списано: {chargedPriceRub} ₽` + мелко `Тариф: {listedPriceRub} ₽`

---

#### Таб "Категории"

Рендерит `CategoryManager` (переиспользовать из Block 07).

В read-only режиме → `readonly` prop = true (карточки не кликабельны, кнопка "Новая категория" disabled).

---

### AdminPage (`/admin`)

**Маршрут:** `/admin`

**Доступ:** только `currentUser.isOwner === true`. Если нет — redirect `/analytics`.

**Структура страницы:**

```
PageHeader title="Админ-панель"
           subtitle="Сводка по пользователям, транзакциям и активности сервиса"
  [actions slot] <Button "Обновить" icon=Refresh loading=isLoading onClick=retry />

[Error state]
  Alert variant=destructive: "{error}" + кнопка "Повторить"

[KPI Grid]
  6 KPI-карточек

[Empty state — нет данных]
  Alert info: "Данных для админ-панели пока нет."

[Users table — только если success и не loading]
  Section header + DataTable

[Loading tables skeleton]
  Skeleton height=260px
```

**KPI Grid (3×2 desktop, 2×3 tablet, 1×6 mobile):**

| Key | Title | Icon |
|-----|-------|------|
| total-users | Пользователи | users |
| active-subscriptions | Активные подписки | credit-card |
| onboarding-completed | Прошли онбординг | check-circle |
| total-accounts | Счета | wallet |
| total-transactions | Транзакции (всего) | chart-bar |
| transactions-30d | Транзакции (30 дней) | clock |

active-subscriptions: показывать trend = `activeSubscriptionsRatePercent`, label "от всех пользователей"
onboarding-completed: показывать trend = `onboardingCompletionRatePercent`, label "от всех пользователей"

Каждая KPI-карточка в loading-состоянии — skeleton.

**Users Table:**

Заголовок секции: "Пользователи (срез)", subtitle "Первые 20 по последней активности"

Scrollable таблица (shadcn Table или DataTable).

Колонки:
| Колонка | Значение |
|---------|---------|
| Email | `user.email ?? "—"` |
| Имя | `user.name` или fallback к email или "Без имени" |
| Роль | Badge: Owner (info/blue) / User (secondary) |
| Подписка | Badge: "Активна" (success) / "Неактивна" (warning) |
| Онбординг | Badge: "Пройден" (success) / "Не пройден" (secondary) |
| Telegram | "Привязан" / "Не привязан" |
| Транзакции | число, `Intl.NumberFormat('ru-RU')` |
| Последняя активность | `lastTransactionAtUtc → toLocaleString('ru-RU')`, null → "—" |

Table key: `user.userId`

---

### LoginPage (`/login`)

**Маршрут:** `/login` (публичный, гостевой layout — без sidebar)

**Layout:**

Centered card, max-width 420px, min-height 100vh, centered vertically.
Background: радиальный gradient с primary tint сверху + linear gradient.
ThemeToggle в правом верхнем углу (absolute positioned).

**Структура карточки:**

```
FinTree brand link → "/"
Заголовок h1: "С возвращением!"

Card:
  Секция Telegram
  Divider "или через Email"
  Email-форма
  Footer ссылка
```

**Telegram OAuth:**

Загружает скрипт Telegram Login Widget:
```
https://telegram.org/js/telegram-widget.js?22
data-telegram-login: {VITE_TELEGRAM_BOT_NAME ?? 'financetree_bot'}
data-size: large
data-radius: 12
data-userpic: false
data-onauth: onTelegramAuth(user)
data-request-access: write
```

Глобальный callback `window.onTelegramAuth` → `POST /api/auth/telegram` с payload.
После успеха → navigate `/analytics`.

Fallback если скрипт не загрузился (timeout 5s): "Виджет Telegram не загрузился. Используйте Email-вход ниже."

Cleanup: при unmount — удалить script tag и `delete window.onTelegramAuth`.

**Email-форма (React Hook Form + Zod):**

```typescript
const loginSchema = z.object({
  email: z.string().email("Введите корректный email."),
  password: z.string().min(1, "Введите пароль."),
});
```

Поля:
- Email: type=email, placeholder "name@domain.com", autocomplete=email
- Пароль: type=password (с toggle show/hide), placeholder "Введите пароль", autocomplete=current-password
  - Кнопка eye/eye-slash: position absolute right, 44×44px touch target, aria-label, aria-pressed
- Ссылка "Забыли пароль?" → `/forgot-password` (right-aligned, мелкий шрифт)

Submit: `POST /api/auth/login` → сохранить JWT → navigate `/analytics`.

Error: показать под формой — иконка exclamation + текст ошибки (красный).
Submit disabled: email пустой || password пустой || loading.

**Footer карточки:**

"Нет аккаунта? [Зарегистрироваться →](/register)"

---

### RegisterPage (`/register`)

**Маршрут:** `/register` (публичный, гостевой layout)

**Layout:** аналогичный LoginPage.

Заголовок h1: "Начните учет финансов"

**Структура карточки:**

```
Секция Telegram (аналогично Login)
Divider "или"
Кнопка "Зарегистрироваться через Email" (toggle)
[если showEmailForm] Email-форма
Footer ссылка
```

**Особенность регистрации:** Email-форма скрыта по умолчанию, показывается по клику на кнопку "Зарегистрироваться через Email".

**Email-форма (React Hook Form + Zod):**

```typescript
const registerSchema = z.object({
  email: z.string().email("Введите корректный email."),
  password: z
    .string()
    .min(8, "Минимум 8 символов.")
    .regex(/[a-z]/, "Строчная буква (a-z).")
    .regex(/[A-Z]/, "Заглавная буква (A-Z).")
    .regex(/\d/, "Цифра (0-9).")
    .regex(/[^a-zA-Z0-9]/, "Спецсимвол (!@#$...)."),
});
```

Поля:
- Email: type=email, placeholder "name@domain.com", autocomplete=email
- Пароль: type=password (с toggle), placeholder "Минимум 8 символов", autocomplete=new-password

**Password checklist** (показывается если поле не пустое):

Список из 5 правил, каждое строка:
- Минимум 8 символов (`length >= 8`)
- Строчная буква a-z (`/[a-z]/`)
- Заглавная буква A-Z (`/[A-Z]/`)
- Цифра 0-9 (`/\d/`)
- Спецсимвол !@#$... (`/[^a-zA-Z0-9]/`)

Иконка checkmark зелёный если met, иконка × красный если не met и есть input.

Submit disabled: email пустой || not allRulesMet || loading.

`POST /api/auth/register` с `{ email, password, passwordConfirmation: password }`.
После успеха → navigate `/analytics`.

Error: показать под формой.

**Footer:** "Уже есть аккаунт? [Войти](/login)"

---

### LandingPage (`/`)

**Маршрут:** `/` (публичный, без sidebar — отдельный layout)

**Страница без auth guard.** Если пользователь уже залогинен — не редиректить, просто показывать.

**Header (sticky nav):**

```
[FinTree brand logo → "/"]                    [ThemeToggle] [Войти → /login]
```

**Секции (сверху вниз):**

**1. Hero section (`#hero`):**

Two-column layout (desktop): copy + screenshot card.

Copy:
- H1: "0 ₽ в первый месяц. Поймите, куда уходят деньги"
- P: "FinTree собирает расходы в одном месте и сразу показывает, где можно сократить траты без сложных таблиц."
- CTA кнопка "Попробовать бесплатно" (large, primary/cta variant) → `/register`
- Disclaimer: "Без привязки карты и скрытых условий."
- Proof row: "Без карты • 2 минуты на старт • отмена в любой момент"

Trust row (3 элемента):
- 🔒 "Данные под защитой"
- ⚡ "Запись расхода за 10 секунд"
- 💳 "Без банковских интеграций"

Screenshot card (muted variant): `<img>` скриншот аналитики, loading=eager.

На mobile (<768px): стек column, изображение под copy.

**2. Screens section (`#screens`):**

```
H2: "Реальные экраны FinTree"
P: "Кабинет после регистрации: живые экраны без мокапов."
Grid card-auto: 3–4 карточки экранов
```

Каждая карточка: `<img>` (lazy) + H3 название + P описание.

Screens data (hardcode в константах):
- Аналитика: описание возможностей аналитики
- Транзакции: описание ввода расходов
- Инвестиции: описание инвест-портфеля
- и др. по наличию assets

**3. Features section (`#features`):**

```
H2: "Почему FinTree работает"
P: "Минимум действий — максимум ясности."
Grid balanced/dense: 4 feature-карточки
```

Каждая карточка (muted): иконка + H3 + P.

Features (hardcode в константах):
- "Один взгляд на финансы" — все счета в одном месте
- "Аналитика без таблиц" — автоматические отчёты
- "Ретроспективы" — месячные итоги с самооценкой
- "FIRE-калькулятор" — путь к финансовой независимости

**4. Pricing section (`#pricing`, alt background):**

```
H2: "Тарифы без сюрпризов"
P: "Полный функционал в обоих тарифах. Первый месяц бесплатный."
Grid auto: 2 плана
CTA кнопка
```

Планы (hardcode):
- **Месяц**: цена/мес, note, description
- **Год**: цена/год (перечёркнутая старая цена), badge "Выгоднее", note, description

Accent-вариант (outlined) для выгодного плана.

CTA под сеткой: "Сначала пользуетесь бесплатно, потом выбираете удобный тариф." + кнопка "Попробовать бесплатно" → `/register`

**Footer:**

```
[FinTree brand] [P описание]     [Nav: Продукт → Экраны/Возможности/Тарифы (smooth scroll)]
---
© {currentYear} FinTree. Все права защищены.  [Политика конфиденциальности] [Условия использования]
```

Smooth scroll для nav-кнопок → `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })`.

---

### PrivacyPolicyPage (`/privacy`) и TermsPage (`/terms`)

Публичные страницы, без sidebar.

Простая разметка: максимальная ширина 800px, центрирована.

- H1 заголовок
- Статичный текст (политика / условия) в нескольких секциях с H2/P
- Ссылка "Назад" или ссылка на `/`

Текст можно поставить как placeholder (lorem ipsum или базовый юридический текст по GDPR).

---

### BlogPage (`/blog`) и CareersPage (`/careers`)

Страницы-заглушки. Без sidebar (публичный layout).

```
Centered content, max-width 640px:
  H1 "Блог" / "Карьера"
  Большая иконка (clock или tools)
  H2 "Скоро"
  P "Раздел находится в разработке. Возвращайтесь позже."
  Ссылка "← На главную" → "/"
```

---

## Constraints & Best Practices

- Компоненты: функциональные, ≤200 строк — иначе декомпозировать
- Нет `any` в TypeScript
- Нет `index` как `key` в динамических списках
- Нет `useEffect` для fetch — только TanStack Query
- Нет дублирования серверных данных в Zustand
- Нет хардкода цветов
- `React.memo` — только при реальной проблеме производительности
- Error boundaries на уровне каждой страницы
- Формы: React Hook Form + Zod
- Telegram Widget: cleanup при unmount (script tag + window callback)
- Login/Register: если уже залогинен при mount → navigate `/analytics`
- Admin page: guard — redirect если `!currentUser.isOwner`
- ProfilePage collapsible history: lazy загрузка платежей (только при открытии)
- LandingPage: `<img loading="eager">` для hero, `<img loading="lazy">` для остальных
- LandingPage: semantic HTML — `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`

## Done When

- [ ] `/profile` открывается, оба таба работают (Настройки / Категории)
- [ ] Identity card показывает имя, email, initials-аватар
- [ ] Форма настроек: Select валют заполнен, Telegram input работает, Save/Reset работают
- [ ] Read-only режим: форма disabled, Save disabled
- [ ] Карточка подписки: статус, даты, кнопки оплаты работают
- [ ] История оплат: collapsible, lazy загрузка, список форматирован
- [ ] Таб Категории: CategoryManager работает (переиспользован из Block 07)
- [ ] Если `isOwner === true`: карточка "Админ-панель" видна
- [ ] `/admin` redirect если не owner
- [ ] `/admin` открывается: 6 KPI-карточек с данными
- [ ] Users table: все колонки, badges, форматирование дат
- [ ] Кнопка "Обновить" перезагружает данные
- [ ] `/login`: email-форма работает, Telegram widget монтируется/размонтируется корректно
- [ ] Login error отображается под формой
- [ ] Пароль show/hide toggle работает
- [ ] `/register`: email-форма скрыта по умолчанию, toggle кнопкой
- [ ] Password checklist: цвета и иконки обновляются в realtime
- [ ] После регистрации → redirect `/analytics`
- [ ] `/`: Landing рендерится полностью (Hero, Screens, Features, Pricing, Footer)
- [ ] Smooth scroll для nav-ссылок в footer работает
- [ ] `/privacy`, `/terms`: статичный текст
- [ ] `/blog`, `/careers`: "Скоро" заглушки
- [ ] Нет TypeScript ошибок, нет ESLint warnings
