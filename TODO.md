### Correctness

- [ ] `FT-TODO-052` `CurrencyConverter`: при отсутствии курса на нужную дату используется ближайший более ранний курс без каких-либо сигналов пользователю. Конвертированная сумма может быть приближённой (особенно для старых транзакций), но пользователь об этом не знает.
  **Fix:** На фронте помечать сконвертированные суммы знаком `~` или тултипом "курс приближённый" когда бэкенд возвращает флаг приближённой конвертации. На бэке добавить поле `IsApproximate: bool` в ответ конвертера и проставлять `true` когда курс взят не с точной даты транзакции.
  **Files:** `FinTree.Application/Currencies/CurrencyConverter.cs` lines 75–88, затронутые аналитические сервисы и фронт-компоненты с отображением сконвертированных сумм.

### Performance

- [ ] `FT-TODO-055` Отсутствуют DB-индексы на высококардинальных полях.

### Maintainability

- [ ] `FT-TODO-060` `TelegramOperationsService`: `AccountsService` и `UserService` создаются вручную через `new` в обход DI — нарушает тестируемость, жёстко привязывает конструкторы.
  **Fix:** Рефакторить через фабрику или параметризованный сервис.
  **Files:** `FinTree.Application/Telegram/TelegramOperationsService.cs` lines 255, 265

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

- [ ] `FT-TODO-064` `EvolutionTab` still formats and models KPI values through its own `evolutionModels.ts` pipeline instead of the shared analytics formatting layer. Direct `toFixed` calls are already gone, but the tab can still drift from the dashboard display contract because formatting rules now live in two places.
  **Fix:** Consolidate `EvolutionTab` onto the shared analytics formatting contract or extract a single reusable formatting layer used by both `models.ts` and `evolutionModels.ts`.
  **Files:** `react-app/src/components/analytics/EvolutionTab.tsx`, `react-app/src/components/analytics/evolutionModels.ts`, `react-app/src/components/analytics/models.ts`

- [ ] `FT-TODO-065` React migration for accounts/transactions needs one cleanup pass to split oversized orchestration files and modal sections into smaller feature components/hooks.
  **Why:** `TransactionsPage`, `TransactionFormModal`, `TransactionList`, and `AccountsPage` now ship working behavior, but they exceed the block guideline of keeping components around 200 lines and will get harder to evolve in later migration blocks.
  **Fix:** Extract page-level query/mutation orchestration into feature hooks and move repeated form/date/summary sections into focused presentational components.
  **Priority:** P2
  **Files:** `react-app/src/pages/AccountsPage.tsx`, `react-app/src/pages/TransactionsPage.tsx`, `react-app/src/features/transactions/TransactionFormModal.tsx`, `react-app/src/features/transactions/TransactionList.tsx`