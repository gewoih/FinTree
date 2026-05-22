- [ ] Создать страницы «Политика конфиденциальности» и «Пользовательское соглашение» и подключить к ссылкам в футере — **обязательно до запуска Яндекс.Директ** (ссылки пока ведут на `#`).

- [ ] `FT-TODO-055` Отсутствуют DB-индексы на высококардинальных полях.

- [ ] `FT-TODO-062` `RetrospectiveService`: (a) `ValidateRatings()` не сообщает какой именно рейтинг невалиден; (b) `HasMeaningfulContent()` дублируется для двух разных типов команды.
  **Fix:** Добавить значение/индекс в сообщение об ошибке; объединить дублированные методы через общий интерфейс или generic.
  **Files:** `FinTree.Application/Retrospectives/RetrospectiveService.cs` lines 193–222

- [ ] `FT-TODO-064` `EvolutionTab` still formats and models KPI values through its own `evolutionModels.ts` pipeline instead of the shared analytics formatting layer. Direct `toFixed` calls are already gone, but the tab can still drift from the dashboard display contract because formatting rules now live in two places.
  **Fix:** Consolidate `EvolutionTab` onto the shared analytics formatting contract or extract a single reusable formatting layer used by both `models.ts` and `evolutionModels.ts`.
  **Files:** `react-app/src/components/analytics/EvolutionTab.tsx`, `react-app/src/components/analytics/evolutionModels.ts`, `react-app/src/components/analytics/models.ts`

- [ ] `FT-TODO-066` `MonthlyScoreService.CalculateTotalMonthScore` возвращает `null`, если хотя бы один компонент `null`. У пользователей, которые ведут только расходы (без доходов), `savingsRate = null` → вся оценка месяца пустая, центральный виджет страницы не отображается.
  **Fix:** Деградировать мягко — считать оценку по доступным компонентам, отсутствующие помечать «нет данных», а не обнулять весь скор.
  **Files:** `FinTree.Application/Analytics/Services/Metrics/MonthlyScoreService.cs`

- [ ] `FT-TODO-067` Стабильность даёт балл 100/100 с одного дня расходов (`requiredStabilityDays = 1`, MAD одного значения = 0). В начале месяца это даёт ложные +25 пунктов к оценке месяца; флаг `isPreview` влияет только на отображение, но не на расчёт балла.
  **Fix:** Не учитывать компонент стабильности в `TotalMonthScore`, пока дней с расходами меньше ~5–7 (либо поднять `requiredStabilityDays`).
  **Files:** `FinTree.Application/Analytics/Services/DashboardService.cs`, `FinTree.Application/Analytics/Services/Metrics/StabilityService.cs`

- [ ] `FT-TODO-068` Виджет «Изменения по категориям» скрывает категории, появившиеся только в текущем месяце: при `previous (base) <= 0` строка пропускается. Самый заметный новый расход месяца не попадает ни в «Рост», ни в «Снижение».
  **Fix:** Показывать новые категории отдельной пометкой («новая»), а не отбрасывать.
  **Files:** `FinTree.Application/Analytics/Services/CategoryDeltaService.cs`

- [ ] `FT-TODO-069` `ForecastService` использует жёстко зашитые индексы перцентилей (`simTotals[3_500/6_000/8_500]`), завязанные на `BootstrapingSimulationsCount = 10_000`. При смене константы прогноз тихо сломается.
  **Fix:** Вычислять индекс перцентиля от фактической длины массива симуляций.
  **Files:** `FinTree.Application/Analytics/Services/ForecastService.cs` lines 132–134