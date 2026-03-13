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

### Observability

- [ ] `FT-TODO-058` Отсутствует `ILogger<T>` во всех аналитических сервисах — нет трейса для: недостаточно данных для прогноза, currency fallback, пустые пулы bootstrap. При расследовании инцидентов нет аудит-трейла.
  **Files:** `FinTree.Application/Analytics/Services/*`

- [ ] `FT-TODO-059` 500-е ошибки не содержат уникального ID для корреляции с логами — пользователь видит "Произошла ошибка" без возможности передать ID в support.
  **Fix:** Генерировать `errorId = Guid.NewGuid()`, включать в ответ и в `logger.LogError(...)`.
  **Files:** `FinTree.Api/Program.cs` ~line 298

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

- [ ] `FT-TODO-063` React migration still has placeholder pages that render `null`, so some public/protected routes remain blank after navigation.
  **Fix:** Port the remaining Vue implementations for landing/profile into `react-app` or add explicit placeholder states instead of empty renders.
  **Files:** `react-app/src/pages/LandingPage.tsx`, `react-app/src/pages/ProfilePage.tsx`

- [ ] `FT-TODO-064` `EvolutionTab` still uses ad hoc `toFixed` / raw analytics values, so the `Динамика` tab now diverges from the normalized dashboard display contract.
  **Fix:** Reuse the analytics formatting helpers from `react-app/src/components/analytics/models.ts` for percentages, months, mean daily spend, and month table cells.
  **Files:** `react-app/src/components/analytics/EvolutionTab.tsx`

- [ ] `FT-TODO-065` React migration for accounts/transactions needs one cleanup pass to split oversized orchestration files and modal sections into smaller feature components/hooks.
  **Why:** `TransactionsPage`, `TransactionFormModal`, `TransactionList`, and `AccountsPage` now ship working behavior, but they exceed the block guideline of keeping components around 200 lines and will get harder to evolve in later migration blocks.
  **Fix:** Extract page-level query/mutation orchestration into feature hooks and move repeated form/date/summary sections into focused presentational components.
  **Priority:** P2
  **Files:** `react-app/src/pages/AccountsPage.tsx`, `react-app/src/pages/TransactionsPage.tsx`, `react-app/src/features/transactions/TransactionFormModal.tsx`, `react-app/src/features/transactions/TransactionList.tsx`

- [ ] `FT-TODO-066` `TransactionList` — кликабельные строки таблицы не доступны с клавиатуры: нет `tabIndex`, `onKeyDown` и `aria-label` на строках-редакторах. При read-only режиме строки не интерактивны — норма. При edit-режиме нужен способ открыть форму без мыши.
  **Fix:** Добавить в `TableRow` (только не-readonly режим): `tabIndex={0}`, `onKeyDown={(e) => e.key === 'Enter' && handleEditRow(...)}`, `aria-label={...}`. Либо добавить явную кнопку редактирования рядом с кнопкой удаления.
  **Files:** `react-app/src/features/transactions/TransactionList.tsx`

- [ ] `FT-TODO-040` SummaryStrip — zone progress bar for the 4 metric cards
  **Context:** Metric cards (Сбережения, Финансовая подушка, Стабильность трат, Необязательные) show numbers with no benchmark context. A segmented zone bar with a position marker communicates the quality of each value at a glance.
  **Zone definitions:**
  | Key | Thresholds (poor/avg, avg/good) | scaleMax | inverted |
  |-----|--------------------------------|---------|---------|
  | savings | 0.1, 0.2 | 0.5 | false |
  | cushion | 1, 3 | 12 | false |
  | stability | 40, 70 | 100 | false |
  | discretionary | 25, 45 | 60 | true |
  Zone widths = `(zoneEnd - zoneStart) / scaleMax × 100%`. Marker = `clamp(value/scaleMax, 0, 1) × 100%`. Inverted = color order flips (green left → red right).
  **Acceptance criteria:** Each of the 4 metric cards has a zone bar at the bottom. Marker position reflects current value. Cards without zone config are unaffected.
