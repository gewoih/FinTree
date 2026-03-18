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

- [ ] `FT-TODO-042` Eliminate double DB fetch in `DashboardService` — `MonthlyAggregator` (2-month window) and `SpendingBreakdownService` (12-month window) each issue independent `GetTransactionSnapshotsAsync` + `GetCrossRatesAsync` calls per request. Consolidate via a shared pre-fetched dataset or result caching.
  **Files:** `FinTree.Application/Analytics/Services/DashboardService.cs`, `FinTree.Application/Analytics/Services/SpendingBreakdownService.cs`

## Frontend UX

- [ ] `FT-TODO-064` `EvolutionTab` still formats and models KPI values through its own `evolutionModels.ts` pipeline instead of the shared analytics formatting layer. Direct `toFixed` calls are already gone, but the tab can still drift from the dashboard display contract because formatting rules now live in two places.
  **Fix:** Consolidate `EvolutionTab` onto the shared analytics formatting contract or extract a single reusable formatting layer used by both `models.ts` and `evolutionModels.ts`.
  **Files:** `react-app/src/components/analytics/EvolutionTab.tsx`, `react-app/src/components/analytics/evolutionModels.ts`, `react-app/src/components/analytics/models.ts`

- [ ] `FT-TODO-066` Ряд страниц и компонентов превышает 400+ строк и требует разбивки на хуки/подкомпоненты для поддерживаемости.
  **Why:** Крупные файлы затрудняют навигацию и эволюцию кода в будущих миграционных блоках.
  **Fix:** По каждому файлу — вынести оркестрационную логику в feature-хук, тяжёлые секции JSX — в сфокусированные подкомпоненты.
  **Priority:** P2
  **Files:**
  - `react-app/src/components/analytics/ForecastCard.tsx` (644 строки) — разбить на подкомпоненты секций/графика
  - `react-app/src/pages/ProfilePage.tsx` (623 строки) — извлечь `useProfilePage` хук
  - `react-app/src/pages/AnalyticsPage.tsx` (526 строк) — извлечь `useAnalyticsPage` хук
  - `react-app/src/components/analytics/EvolutionTab.tsx` (470 строк) — разбить на подкомпоненты вкладок/секций
  - `react-app/src/pages/RetroDetailPage.tsx` (415 строк) — извлечь `useRetroDetailPage` хук
  - `react-app/src/components/analytics/SpendingPieCard.tsx` (396 строк) — разбить на подкомпоненты
  - `react-app/src/features/categories/CategoryFormModal.tsx` (372 строки) — извлечь `useCategoryForm` хук