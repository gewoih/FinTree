- [ ] `FT-TODO-052` `CurrencyConverter`: при отсутствии курса на нужную дату используется ближайший более ранний курс без каких-либо сигналов пользователю. Конвертированная сумма может быть приближённой (особенно для старых транзакций), но пользователь об этом не знает.
  **Fix:** На фронте помечать сконвертированные суммы тултипом "приблизительный курс" когда бэкенд возвращает флаг приближённой конвертации + показывать на фронте конкретный курс конвертации для прозрачности. На бэке добавить поле `IsApproximate: bool` в ответ конвертера и проставлять `true` когда курс взят не с точной даты транзакции.
  **Files:** `FinTree.Application/Currencies/CurrencyConverter.cs` lines 75–88, затронутые аналитические сервисы и фронт-компоненты с отображением сконвертированных сумм.

- [ ] `FT-TODO-055` Отсутствуют DB-индексы на высококардинальных полях.

- [ ] `FT-TODO-062` `RetrospectiveService`: (a) `ValidateRatings()` не сообщает какой именно рейтинг невалиден; (b) `HasMeaningfulContent()` дублируется для двух разных типов команды.
  **Fix:** Добавить значение/индекс в сообщение об ошибке; объединить дублированные методы через общий интерфейс или generic.
  **Files:** `FinTree.Application/Retrospectives/RetrospectiveService.cs` lines 193–222

- [ ] `FT-TODO-064` `EvolutionTab` still formats and models KPI values through its own `evolutionModels.ts` pipeline instead of the shared analytics formatting layer. Direct `toFixed` calls are already gone, but the tab can still drift from the dashboard display contract because formatting rules now live in two places.
  **Fix:** Consolidate `EvolutionTab` onto the shared analytics formatting contract or extract a single reusable formatting layer used by both `models.ts` and `evolutionModels.ts`.
  **Files:** `react-app/src/components/analytics/EvolutionTab.tsx`, `react-app/src/components/analytics/evolutionModels.ts`, `react-app/src/components/analytics/models.ts`