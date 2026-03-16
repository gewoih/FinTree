## Backend Audit

### API / HTTP Conventions

- [ ] `FT-TODO-044` DELETE-эндпоинты используют `[FromQuery] Guid id` вместо `[FromRoute]` — нарушает REST: ID ресурса должен быть в пути URL.
  **Fix:** `[HttpDelete("{id:guid}")]` с параметром без атрибута.
  **Files:** `FinTree.Api/Controllers/TransactionController.cs` (lines 72, 79), `FinTree.Api/Controllers/TransactionCategoryController.cs` (line 28)

- [ ] `FT-TODO-045` Неверные HTTP status codes: POST возвращает 200 вместо 201, PUT/DELETE — 200 вместо 204.
  **Fix:** Использовать `StatusCode(201, id)` для создания, `NoContent()` для обновлений/удалений.
  **Files:** Все контроллеры в `FinTree.Api/Controllers/`

### Security

- [ ] `FT-TODO-046` CORS: `AllowAnyHeader()` + `AllowAnyMethod()` нейтрализуют CORS как защиту.
  **Fix:** Заменить на явный список методов (`GET, POST, PUT, PATCH, DELETE, OPTIONS`) и заголовков (`Content-Type, Authorization`).
  **Files:** `FinTree.Api/Program.cs` ~line 86

- [ ] `FT-TODO-047` Не настроен `MaxRequestBodySize` — Kestrel по умолчанию разрешает ~30 MB, что открывает вектор для DoS.
  **Fix:** `builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 10_485_760)`.
  **Files:** `FinTree.Api/Program.cs`

- [ ] `FT-TODO-048` Open redirect: `PhotoUrl` из Telegram login response не валидируется перед возвратом клиенту — контролируемый аккаунт Telegram может передать произвольный URL.
  **Fix:** Проверять, что хост оканчивается на `.telegram.org` или `.t.me`; иначе обнулять поле.
  **Files:** `FinTree.Application/Users/AuthService.cs` ~line 81

### Domain Invariants

- [ ] `FT-TODO-049` `Transaction.Update()` позволяет менять `AccountId` на любой GUID без проверки принадлежности аккаунта тому же пользователю — транзакция может переехать в чужой аккаунт.
  **Files:** `FinTree.Domain/Transactions/Transaction.cs` lines 51–64

- [ ] `FT-TODO-050` `Account.AddTransaction()` не проверяет совпадение валюты транзакции и аккаунта — нарушен доменный инвариант (USD-транзакция добавляется в рублёвый аккаунт без ошибки).
  **Files:** `FinTree.Domain/Accounts/Account.cs` lines 39–52

- [ ] `FT-TODO-051` `FxUsdRate` не нормализует `DateTimeKind` в конструкторе — `AccountBalanceAdjustment` делает это через `NormalizeDate()`, `FxUsdRate` — нет. Несоответствие создаёт промахи при поиске курсов в словарях.
  **Files:** `FinTree.Domain/Currencies/FxUsdRate.cs` lines 10–18

### Correctness

- [ ] `FT-TODO-052` `CurrencyConverter`: при отсутствии курса на нужную дату используется **самый старый** курс в системе без каких-либо сигналов. Транзакция 2025 года может конвертироваться по курсу 2020-го.
  **Fix:** Заменить на явный выброс или ограниченный fallback (±7 дней) с предупреждением в лог.
  **Files:** `FinTree.Application/Currencies/CurrencyConverter.cs` lines 75–88

- [ ] `FT-TODO-053` Прямой индексатор `rateByCurrencyAndDay[rateKey]` без защиты в нескольких сервисах — `KeyNotFoundException` если конвертер не вернул курс (edge case: новая валюта без исторических данных).
  **Fix:** Заменить на `TryGetValue` + явный выброс с контекстом (валюта, дата).
  **Files:** `FinTree.Application/Analytics/Services/SpendingBreakdownService.cs:39`, `CashflowAverageService.cs:64`, `ForecastService.cs:39`, `EvolutionService.cs:206`

### Performance

- [ ] `FT-TODO-054` Отсутствует `.AsNoTracking()` на read-only EF-запросах — лишние allocations на change-tracking граф.
  **Files:** `FinTree.Application/Users/UserService.cs` lines 26–29 и аналогичные места с `.Include()` без последующего изменения

- [ ] `FT-TODO-055` Отсутствуют DB-индексы на высококардинальных полях — все аналитические запросы фильтруют по ним.
  **Fix:** Добавить в `OnModelCreating`: `Transaction.OccurredAt`, composite `(AccountId, OccurredAt)`, `CategoryId`.
  **Требует EF-миграции.**
  **Files:** `FinTree.Infrastructure/Database/AppDbContext.cs`

- [ ] `FT-TODO-056` N+1 в `AdminService`: `IsInRoleAsync()` вызывается в цикле — каждый вызов = отдельный SQL-запрос.
  **Fix:** Переписать через batch-запрос к таблице ролей или join в одном запросе.
  **Files:** `FinTree.Application/Admin/AdminService.cs` lines 137–141

- [ ] `FT-TODO-057` `NetWorthService` вызывает `currencyConverter.ConvertAsync()` внутри цикла по месяцам — N API-вызовов вместо одного предварительного.
  **Fix:** Собрать все уникальные пары (валюта, дата) до цикла, получить курсы одним запросом.
  **Files:** `FinTree.Application/Analytics/Services/NetWorthService.cs` lines 115–130

### Maintainability

- [ ] `FT-TODO-060` `TelegramOperationsService`: `AccountsService` и `UserService` создаются вручную через `new` в обход DI — нарушает тестируемость, жёстко привязывает конструкторы.
  **Fix:** Рефакторить через фабрику или параметризованный сервис.
  **Files:** `FinTree.Application/Telegram/TelegramOperationsService.cs` lines 255, 265

- [ ] `FT-TODO-061` Дублирование логики разрешения категорий при создании и обновлении переводов в `TransactionsService` — идентичные блоки.
  **Fix:** Извлечь в приватный метод.
  **Files:** `FinTree.Application/Transactions/TransactionsService.cs` lines 285–297 и 372–388

- [ ] `FT-TODO-062` `RetrospectiveService`: (a) `ValidateRatings()` не сообщает какой именно рейтинг невалиден; (b) `HasMeaningfulContent()` дублируется для двух разных типов команды.
  **Fix:** Добавить значение/индекс в сообщение об ошибке; объединить дублированные методы через общий интерфейс или generic.
  **Files:** `FinTree.Application/Retrospectives/RetrospectiveService.cs` lines 193–222

## Analytics Backend

- [ ] `FT-TODO-043` Сделать `CategoryId` nullable на транзакции — текущий подход с fallback-категорией `"Без категории"` маскирует отсутствие категории как реальную сущность. Необходимо: (1) сделать `CategoryId` nullable в доменной модели `Transaction` и EF-конфигурации, (2) обновить `TransactionAnalyticsSnapshot` и все аналитические сервисы, (3) убрать `UnknownMeta` fallback из `CategoryItemBuilder` и `AnalyticsCommon`, (4) обновить API-контракты и фронт — показывать "без категории" как отдельное UI-состояние (серый чип / курсив) вместо fallback-записи.
  **Требует EF-миграции.**
  **Files:** `FinTree.Domain/Transactions/Transaction.cs`, `FinTree.Infrastructure/` (EF config), `FinTree.Application/Transactions/TransactionAnalyticsSnapshot.cs`, `FinTree.Application/Analytics/Services/CategoryItemBuilder.cs`, `FinTree.Application/Analytics/Shared/AnalyticsCommon.cs`, фронт (все компоненты с отображением категории транзакции).

- [ ] `FT-TODO-041` Consolidate `"Без категории"` / `"#9e9e9e"` magic strings in `TransactionCategoryService` and `TransactionsService` to use `AnalyticsCommon` constants or a shared domain constant — currently these literals still appear in non-analytics code after the `AnalyticsCommon` consolidation.
  **Files:** `FinTree.Application/Transactions/TransactionCategoryService.cs`, `FinTree.Application/Transactions/TransactionsService.cs`

- [ ] `FT-TODO-042` Eliminate double DB fetch in `DashboardService` — `MonthlyAggregator` (2-month window) and `SpendingBreakdownService` (12-month window) each issue independent `GetTransactionSnapshotsAsync` + `GetCrossRatesAsync` calls per request. Consolidate via a shared pre-fetched dataset or result caching.
  **Files:** `FinTree.Application/Analytics/Services/DashboardService.cs`, `FinTree.Application/Analytics/Services/SpendingBreakdownService.cs`

## Frontend UX

- [ ] `FT-TODO-063` Invalid retrospective deep links can still fall through to a blank render before redirect because `RetroDetailPage` returns `null` when `month` is invalid.
  **Fix:** Validate the route param in TanStack Router `beforeLoad` or render an explicit not-found / invalid-month state instead of `return null`.
  **Files:** `react-app/src/pages/RetroDetailPage.tsx`, `react-app/src/router/index.ts`

- [ ] `FT-TODO-064` `EvolutionTab` still formats and models KPI values through its own `evolutionModels.ts` pipeline instead of the shared analytics formatting layer. Direct `toFixed` calls are already gone, but the tab can still drift from the dashboard display contract because formatting rules now live in two places.
  **Fix:** Consolidate `EvolutionTab` onto the shared analytics formatting contract or extract a single reusable formatting layer used by both `models.ts` and `evolutionModels.ts`.
  **Files:** `react-app/src/components/analytics/EvolutionTab.tsx`, `react-app/src/components/analytics/evolutionModels.ts`, `react-app/src/components/analytics/models.ts`

- [ ] `FT-TODO-065` React migration for accounts/transactions needs one cleanup pass to split oversized orchestration files and modal sections into smaller feature components/hooks.
  **Why:** `TransactionsPage`, `TransactionFormModal`, `TransactionList`, and `AccountsPage` now ship working behavior, but they exceed the block guideline of keeping components around 200 lines and will get harder to evolve in later migration blocks.
  **Fix:** Extract page-level query/mutation orchestration into feature hooks and move repeated form/date/summary sections into focused presentational components.
  **Priority:** P2
  **Files:** `react-app/src/pages/AccountsPage.tsx`, `react-app/src/pages/TransactionsPage.tsx`, `react-app/src/features/transactions/TransactionFormModal.tsx`, `react-app/src/features/transactions/TransactionList.tsx`

- [ ] `FT-TODO-070` Frontend regression safety net is missing: `react-app` has no test runner script, no `vitest`/browser test pipeline, and the repo currently contains no React `*.test.*` / `*.spec.*` files.
  **Fix:** Add `vitest` + React Testing Library test scripts, cover critical auth/forms/cache-invalidations/accessibility flows, and wire the suite into the standard verification path.
  **Files:** `react-app/package.json`, `react-app/` test config files, critical page/feature test files under `react-app/src/**`

- [ ] `FT-TODO-071` Server state for session/user is duplicated outside React Query across `authStore`, `userStore`, and `useEnsureCurrentUser`, creating multiple bootstrap paths, custom in-flight deduplication, and manual cache hydration logic that will get harder to evolve.
  **Fix:** Consolidate authenticated user/session loading behind a single query-backed hook and keep Zustand only for true client UI state (theme, ephemeral toggles).
  **Files:** `react-app/src/stores/authStore.ts`, `react-app/src/stores/userStore.ts`, `react-app/src/hooks/useEnsureCurrentUser.ts`, `react-app/src/router/index.ts`

- [ ] `FT-TODO-073` Third-party scripts are injected globally from `index.html` and runtime widget code without visible consent/CSP hardening (`Yandex Metrika`, Telegram widget). This increases privacy/security review surface and makes strict CSP adoption harder later.
  **Fix:** Add an explicit loading policy for third-party scripts (consent gate or documented exception), centralize script injection, and document the CSP allowances required for production.
  **Files:** `react-app/index.html`, `react-app/src/components/auth/TelegramAuthWidget.tsx`
