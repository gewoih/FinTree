# Личный финансовый советник — шаг 1 (траты): план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Еженедельная сводка и сообщение в день зарплаты в Telegram плюс месячный разбор в Claude Code — по правилу «отложить долю зарплаты» нарастающим итогом.

**Architecture:** FinTree получает личный токен (схема аутентификации из env, без БД) и эндпоинт «написать себе в Telegram». Детерминированный Python-скрипт `finmetrics` забирает данные по токену и считает все цифры. Три навыка Claude Code превращают цифры в текст: два запускаются облачными задачами по расписанию, один — локально для диалога.

**Tech Stack:** ASP.NET Core (.NET 10), Telegram.Bot 22; Python 3 только стандартная библиотека (`urllib`, `json`, `statistics`, `unittest`); навыки Claude Code; облачные задачи через навык `schedule`.

**Spec:** `docs/superpowers/specs/2026-11-16-personal-finance-advisor-design.md` (инвестиционный модуль — отдельный план, шаг 2).

## Global Constraints

- Без EF-миграций и изменений схемы БД.
- Агент не запускает `dotnet build/test/run/publish` — сборку и проверку бэкенда делает владелец.
- Тесты для бэкенда не пишутся (правило проекта). Тесты есть только для Python-скрипта (это не backend/frontend).
- Никаких `git add`/`git commit`/`git push` без явного согласия владельца — каждая задача заканчивается предложением коммита.
- Перед правкой существующего символа C# — impact-анализ GitNexus (`AGENTS.md`), риск HIGH/CRITICAL — сообщить владельцу.
- Репозиторий публичный: никаких личных цифр, токенов, chat id в коммитах. Личное — только в `.claude/finance/` (в `.gitignore`).
- Токен: префикс `ftpat_`; в конфиге хранится только SHA-256 hex (нижний регистр).
- Все суммы — `amountInBaseCurrency`; переводы (`isTransfer`) исключаются; даты — в часовом поясе из конфига (`tz_offset_hours`).
- Сообщения в Telegram — формат `Plain` (без HTML/Markdown, чтобы не экранировать описания операций), не длиннее 4096 символов.
- Тон текстов — раздел 5 спеки: вывод первой строкой, простой русский, без нравоучений, не больше одного наблюдения в неделю, сомнительное — вопросом.

## Review Focus

1. Запрос с cookie-сессией и без заголовка `Bearer ftpat_` должен работать ровно как раньше (сайт не ломается) — проверка в Task 2, шаг «матрица curl».
2. Операция, записанная в 20:00–23:59 UTC, относится к следующему дню при `tz_offset_hours=5` — тест `test_parse_uses_almaty_date` в Task 4.
3. Начало месяца до первой выплаты: «можно потратить» считается от ожидаемой зарплаты, а не уходит в минус — тест `test_month_outlook_before_first_payday` в Task 4.
4. Последняя страница операций ровно из 50 записей — пагинация должна запросить следующую и остановиться на пустой — тест `test_fetch_all_pages_stops_on_empty_page` в Task 5.
5. `liquidAssets` в дашборде `null` или устарел — сводка не падает и не врёт о подушке — тест `test_cushion_unknown_when_liquid_assets_missing` в Task 4.

---

### Task 1: Пробный запуск облачной задачи (с владельцем)

Цель — до разработки выяснить возможности облачных задач: от этого зависят Task 6–7.

**Files:**
- Modify: `docs/superpowers/specs/2026-11-16-personal-finance-advisor-design.md` (раздел 10 — записать результаты)

- [ ] **Step 1:** Через навык `schedule` создать одноразовую тестовую задачу на этом репозитории с промптом: вывести `python3 --version`; вывести, задана ли переменная `FINTREE_PAT` (только `set`/`unset`, не значение); выполнить `curl -s -o /dev/null -w "%{http_code}" https://fin-tree.ru/api/currencies`; попробовать опубликовать приватный артефакт с текстом «test».
- [ ] **Step 2:** Владелец добавляет в настройки задачи секрет `FINTREE_PAT=test` тем способом, который предлагает навык `schedule`.
- [ ] **Step 3:** Запустить задачу. Ожидается: Python ≥ 3.10, `FINTREE_PAT set`, HTTP `401`. Артефакт — да или нет.
- [ ] **Step 4:** Записать результаты в раздел 10 спеки. Решения по развилкам:
  - секретов нет → остановиться и вернуться к владельцу (класть токен в текст промпта нельзя);
  - нет доступа к fin-tree.ru → остановиться и вернуться к владельцу;
  - артефакт недоступен → в Task 6 используется fallback: полный текст прямо в Telegram, без ссылки.
- [ ] **Step 5:** Удалить тестовую задачу. Предложить владельцу коммит правки спеки.

---

### Task 2: Личный токен в бэкенде

**Files:**
- Create: `FinTree.Api/PersonalAccess/PersonalAccessTokenOptions.cs`
- Create: `FinTree.Api/PersonalAccess/PersonalAccessTokenAuthenticationHandler.cs`
- Create: `FinTree.Api/PersonalAccess/PersonalAccessScopeMiddleware.cs`
- Modify: `FinTree.Api/Program.cs:163-215` (опции, аутентификация), `FinTree.Api/Program.cs:356-359` (конвейер)
- Modify: `compose.yaml` (сервис `fintree.api`, блок `environment`)

**Interfaces:**
- Produces: `PersonalAccessTokenDefaults.Scheme = "PersonalAccessToken"`, `PersonalAccessTokenDefaults.TokenPrefix = "ftpat_"`; claims `ClaimTypes.NameIdentifier`, `sub` = UserId, `fintree:auth` = `pat`, `fintree:scope` (по одному на scope); scopes `read`, `retro:write`, `notify`.

- [ ] **Step 1:** Impact-анализ GitNexus для изменений в `Program.cs` (аутентификация) — сообщить владельцу радиус.
- [ ] **Step 2: Опции** — `PersonalAccessTokenOptions { List<PersonalAccessTokenEntry> Tokens }`, `PersonalAccessTokenEntry { string? Name; string? TokenHash; string? UserId; List<string> Scopes }`. Все поля строки: пустые переменные окружения из compose не должны ронять биндинг. Регистрация: `builder.Services.Configure<PersonalAccessTokenOptions>(builder.Configuration.GetSection("PersonalAccess"))`.
- [ ] **Step 3: Обработчик** `PersonalAccessTokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>`:
  - нет заголовка `Authorization: Bearer ftpat_…` → `NoResult`;
  - SHA-256 от полного токена (с префиксом) сравнивается с `TokenHash` каждой валидной записи через `CryptographicOperations.FixedTimeEquals`;
  - записи с пустым hash или неразбираемым `UserId` пропускаются с warning в лог (один раз при старте или при каждом запросе — на выбор исполнителя);
  - нет совпадения → `Fail("invalid token")`, в лог не пишется ни токен, ни hash.
- [ ] **Step 4: Выбор схемы** — `AddPolicyScheme("Smart", …)` с `ForwardDefaultSelector`: заголовок начинается с `Bearer ftpat_` → `PersonalAccessToken`, иначе `JwtBearerDefaults.AuthenticationScheme`. `DefaultAuthenticateScheme` и `DefaultChallengeScheme` = `"Smart"`. Существующая настройка JwtBearer (`Program.cs:191-215`) не меняется.
- [ ] **Step 5: Middleware** `PersonalAccessScopeMiddleware`: если у пользователя нет claim `fintree:auth=pat` — пропустить. Иначе разрешить только (сравнение пути без учёта регистра):

  | Метод | Путь (regex) | Scope |
  |---|---|---|
  | GET | `^/api/transaction$` | read |
  | GET | `^/api/users/(me\|accounts\|categories)$` | read |
  | GET | `^/api/analytics/(dashboard\|net-worth\|evolution)$` | read |
  | GET | `^/api/retrospectives(/.*)?$` | read |
  | POST | `^/api/retrospectives$` | retro:write |
  | PUT | `^/api/retrospectives/\d{4}-\d{2}$` | retro:write |
  | POST | `^/api/users/me/notify$` | notify |

  Всё остальное → 403, JSON `{ error: "Токен не даёт доступа к этому действию.", code: "pat_forbidden" }` (по образцу `SubscriptionWriteAccessMiddleware.cs`). Подключить сразу после `app.UseAuthentication()`, до `SubscriptionWriteAccessMiddleware`.
- [ ] **Step 6: compose.yaml** — добавить `PersonalAccess__Tokens__0__Name: advisor`, `PersonalAccess__Tokens__0__TokenHash: ${FINTREE_PAT_0_HASH}`, `PersonalAccess__Tokens__0__UserId: ${FINTREE_PAT_0_USER_ID}`, `PersonalAccess__Tokens__0__Scopes__0: read`, `…__1: retro:write`, `…__2: notify`.
- [ ] **Step 7: Инструкция владельцу** (в ответе, не в репозитории): генерация `python3 -c "import secrets;print('ftpat_'+secrets.token_urlsafe(32))"`, hash `printf %s "$TOKEN" | shasum -a 256`; hash и UserId — в серверный `.env`; сам токен — в менеджер паролей и в `.claude/finance/secrets.env` как `FINTREE_PAT=…`.
- [ ] **Step 8: Сборка и деплой** — делает владелец. Затем матрица curl (выполняет агент, токен берёт из `.claude/finance/secrets.env`):
  - без заголовка `GET /api/transaction?page=1&size=1` → 401;
  - с токеном → 200;
  - токен с изменённым последним символом → 401;
  - с токеном `POST /api/transaction` → 403 `pat_forbidden`;
  - с токеном `GET /api/admin/users` (любой admin-путь) → 403 `pat_forbidden`;
  - в браузере сайт работает как раньше (вход, список операций, добавление операции).
- [ ] **Step 9:** Предложить владельцу коммит.

---

### Task 3: Эндпоинт «написать себе в Telegram»

**Files:**
- Create: `FinTree.Application/Telegram/ITelegramNotifier.cs`
- Create: `FinTree.Application/Telegram/SelfNotificationService.cs`
- Create: `FinTree.Infrastructure/Telegram/TelegramNotifier.cs`
- Create: `FinTree.Infrastructure/Telegram/TelegramParseModes.cs`
- Modify: `FinTree.Infrastructure/Telegram/TelegramBotHostedService.cs:129-140` (`SendResponseAsync` использует общий маппер)
- Modify: `FinTree.Api/Controllers/UsersController.cs` (новый action)
- Modify: `FinTree.Api/Program.cs:235-293` (регистрация)

**Interfaces:**
- Consumes: scope `notify` из Task 2.
- Produces: `POST /api/users/me/notify`, тело `{ "text": string, "format": "Plain"|"Markdown"|"Html" }` (format по умолчанию `Plain`), ответ 204. Ошибки: пустой текст или длиннее 4096 → 400 (`DomainValidationException`); Telegram не привязан → 409 `telegram_not_linked` (`ConflictException`); бот не настроен → 409 `telegram_unavailable`.

- [ ] **Step 1:** Impact-анализ GitNexus для `TelegramBotHostedService.SendResponseAsync` и `UsersController`.
- [ ] **Step 2:** `TelegramParseModes.From(TelegramTextFormat format) -> ParseMode` — вынести switch из `TelegramBotHostedService.cs:131-137`, hosted service использует его.
- [ ] **Step 3:** `ITelegramNotifier.SendAsync(long telegramUserId, string text, TelegramTextFormat format, CancellationToken ct)`; `TelegramNotifier` — через `TelegramBotClient.SendMessage` (chat id = telegram user id). Если `Telegram:BotToken` не задан, регистрируется `UnavailableTelegramNotifier`, который бросает `ConflictException("Telegram-бот не настроен", "telegram_unavailable")`.
- [ ] **Step 4:** `SelfNotificationService.NotifyCurrentUserAsync(string text, TelegramTextFormat format, CancellationToken ct)` — валидация длины 1..4096, чтение `TelegramUserId` текущего пользователя (`ICurrentUser` + `IAppDbContext`), `null` → `ConflictException("Telegram не привязан", "telegram_not_linked")`.
- [ ] **Step 5:** `UsersController`: `[HttpPost("me/notify")] Notify([FromBody] NotifySelfRequest request)`, `record NotifySelfRequest(string Text, TelegramTextFormat Format = TelegramTextFormat.Plain)` → 204.
- [ ] **Step 6:** Сборка и деплой — владелец. Проверка curl с токеном: `{"text":"тест советника"}` → 204, сообщение пришло в Telegram; текст из 4097 символов → 400.
- [ ] **Step 7:** Предложить владельцу коммит.

---

### Task 4: `finmetrics` — расчёты (чистые функции и тесты)

**Files:**
- Create: `.claude/fin-advisor/finmetrics/__init__.py`
- Create: `.claude/fin-advisor/finmetrics/config.py`
- Create: `.claude/fin-advisor/finmetrics/metrics.py`
- Create: `.claude/fin-advisor/tests/test_metrics.py`
- Create: `.claude/fin-advisor/config.example.json` (обезличенный пример; настоящий — `.claude/finance/config.json`)

**Interfaces (Produces):**
- `load_config(path: str | None) -> Config`: если `path` задан, читается файл; иначе JSON из env `FIN_CONFIG_JSON`. Поля (frozen dataclass): `save_rate: float`, `start_date: date`, `tz_offset_hours: int`, `paydays: list[int]`, `salary_category: str`, `expected_salary: list[tuple[str, float]]` (из `[{"from":"YYYY-MM","monthly":N}]`), `baseline_months: list[str]`, `probation_until: date | None`, `min_cushion_months: float`, `fi: FiParams(target_capital, start_capital, real_return, salary_growth)`.
- `Tx(day: date, kind: Literal["Income","Expense"], amount: float, category: str, description: str)`.
- `parse_transactions(raw: list[dict], categories: dict[str, str], tz_offset_hours: int) -> list[Tx]` — берёт `occurredAt` или `occuredAt`, отбрасывает `isTransfer`, категория без имени → `"-"`.
- `expected_monthly_salary(cfg, month: str) -> float` — последняя запись с `from <= month`; нет записи → 0.
- `savings_counter(txs, cfg, until: date) -> Counter(salary, income, expenses, saved, target, gap)` за период `[start_date, until]`: `target = salary * save_rate`, `saved = income - expenses`, `gap = target - saved` (>0 — «долг перед собой»).
- `typical_month_spend(txs, cfg) -> float` — медиана расходов по `baseline_months`.
- `typical_week_spend(txs, cfg) -> float` — медиана сумм расходов по неделям Пн–Вс, целиком лежащим внутри базовых месяцев.
- `month_outlook(txs, cfg, today) -> Outlook(month_income, month_expenses, salary_received, salary_expected_remaining, month_target, can_spend)`: `salary_expected_remaining = max(0, expected_monthly_salary(month) - salary_received)`; `month_target = (salary_received + salary_expected_remaining) * save_rate`; `can_spend = month_income + salary_expected_remaining - month_target - month_expenses`. Долг прошлых месяцев сюда не входит.
- `carried_gap(txs, cfg, today) -> float` — `savings_counter(..., until=последний день прошлого месяца).gap`, но не раньше `start_date` (если старт в текущем месяце → 0).
- `payoff_months(gap, cfg, month, typical_month) -> float | None`: `gap <= 0` → 0.0; `repay = expected_monthly_salary(month) * (1 - save_rate) - typical_month`; `repay <= 0` → None; иначе `round(gap / repay, 1)`.
- `week_summary(txs, cfg, today) -> Week(start, end, spent, typical, top: list[tuple[str, float]])` — последняя полная неделя Пн–Вс до `today`, топ-3 категории.
- `sustained_trends(txs, cfg, today) -> list[Trend(category, recent_avg, baseline_avg)]` — последние 3 полных месяца: каждый больше `1.3 × baseline_avg` и `recent_avg - baseline_avg >= 3000`; сортировка по превышению по убыванию.
- `fi_shift_days(cfg, gap, month) -> int` — помесячная симуляция: капитал растёт на `real_return/12`, ежемесячный взнос = `expected_monthly_salary(month) * save_rate` с ростом на `salary_growth` каждые 12 месяцев, до достижения `target_capital` (последний месяц — линейная интерполяция). Результат = (срок при старте `start_capital - gap`) − (срок при `start_capital`) в днях (`× 30.44`, округление). Положительное — свобода отдаляется.
- `cushion(liquid_assets: float | None, typical_month: float, cfg, today) -> Cushion(months: float | None, below_min: bool, probation_active: bool)`.

- [ ] **Step 1: Тесты** в `test_metrics.py` (`unittest`, синтетические данные, `save_rate=0.5`, `start_date=2026-11-01`, `tz_offset_hours=5`, зарплата `[("2026-11", 300000)]`):
  - `test_parse_uses_almaty_date`: `occuredAt="2026-11-30T20:30:00Z"` → `day == date(2026,12,1)`; запись с `isTransfer=True` отброшена.
  - `test_savings_counter_gap`: зарплата 200000 и расход 120000 после старта, расход 50000 до старта → `target==100000`, `saved==80000`, `gap==20000`.
  - `test_other_income_reduces_gap_not_target`: плюс доход «Продажа собственности» 30000 → `target==100000`, `gap==-10000`.
  - `test_month_outlook_before_first_payday`: `today=2026-12-05`, зарплат в декабре нет, расходы 40000 → `salary_expected_remaining==300000`, `month_target==150000`, `can_spend==110000`.
  - `test_month_outlook_after_both_payments`: в декабре пришло 120000 + 180000, расходы 100000 → `salary_expected_remaining==0`, `can_spend==50000`.
  - `test_payoff_months`: `gap=64000`, `typical_month=118000` → `round(64000/32000,1) == 2.0`; при `typical_month=150000` → `None`; `gap=-1` → `0.0`.
  - `test_sustained_trend_needs_three_months`: категория выше базы в 2 из 3 последних месяцев → не тренд; во всех трёх с превышением ≥ 3000 → тренд.
  - `test_fi_shift_days_sign`: `gap>0` → результат > 0; `gap=0` → 0.
  - `test_cushion_unknown_when_liquid_assets_missing`: `liquid_assets=None` → `months is None`, `below_min is False`.
  - `test_cushion_below_min_during_probation`: `liquid=500000`, `typical=150000`, `today < probation_until` → `below_min and probation_active`.
- [ ] **Step 2:** `cd .claude/fin-advisor && python3 -m unittest discover -s tests -v` → FAIL (модуля нет).
- [ ] **Step 3:** Реализовать `config.py` и `metrics.py` по сигнатурам выше.
- [ ] **Step 4:** Та же команда → все тесты PASS.
- [ ] **Step 5:** Создать `.claude/finance/config.json` из профиля (`.claude/finance/profile.md`): доля, дата старта, дни выплат, ожидаемая зарплата по периодам, базовые месяцы февраль–май 2026, конец испытательного срока, минимум подушки 6, параметры независимости. Предложить владельцу коммит (без `.claude/finance/`).

---

### Task 5: `finmetrics` — API-клиент и CLI

**Files:**
- Create: `.claude/fin-advisor/finmetrics/api.py`
- Create: `.claude/fin-advisor/finmetrics/__main__.py`
- Modify: `.claude/fin-advisor/tests/test_metrics.py` (тест пагинации)

**Interfaces:**
- Consumes: всё из Task 4; токен из env `FINTREE_PAT`; `FINTREE_BASE_URL` (по умолчанию `https://fin-tree.ru`).
- Produces: `FinTreeClient(base_url, token, fetch=None)` с методами `transactions(from_day: date) -> list[dict]` (страницы `size=50`, до первой пустой или неполной), `categories() -> dict[str, str]`, `dashboard(year, month) -> dict`, `retrospectives() -> list[dict]`. Параметр `fetch` — подмена HTTP в тестах. User-Agent: `fintree-advisor`.
- Produces: `python3 -m finmetrics report [--config PATH] [--today YYYY-MM-DD]` → JSON в stdout: `{ today, counter, carried_gap, payoff_months, outlook, week, trends, fi_shift_days, cushion, typical_month, warnings }`. Данные берутся с первого базового месяца. В `warnings` всегда есть строка про возможную неактуальность `liquidAssets`, пока владелец не начал записывать переводы. Ошибки HTTP → код выхода 2 и понятный текст в stderr, без токена.

- [ ] **Step 1: Тест** `test_fetch_all_pages_stops_on_empty_page`: подменённый `fetch` отдаёт страницы из 50, 50 и 0 записей → `len(result)==100`, запрошено ровно 3 страницы.
- [ ] **Step 2:** Запуск → FAIL. Реализовать `api.py` и `__main__.py`. Запуск → PASS.
- [ ] **Step 3:** Проверка на боевых данных: `set -a; . ../finance/secrets.env; set +a; python3 -m finmetrics report --config ../finance/config.json --today 2026-11-16` (из `.claude/fin-advisor`). Ожидается: `counter.salary` ≈ ноябрьская зарплата из FinTree, `counter.expenses` совпадает с дашбордом за ноябрь (±1 ₽), `warnings` не пуст.
- [ ] **Step 4:** Предложить владельцу коммит.

---

### Task 6: Навык `fin-weekly` и облачная задача

**Files:**
- Create: `.claude/skills/fin-weekly/SKILL.md`

**Interfaces:**
- Consumes: CLI из Task 5, `POST /api/users/me/notify` из Task 3, результаты Task 1 (артефакт: да или нет).

- [ ] **Step 1: SKILL.md** — описание «еженедельная сводка по правилу сбережений»; шаги: запустить `report`, составить сообщение, отправить через notify (`format: Plain`). Правила текста:
  - строка 1 — вердикт: 🟢 `gap <= 0`; 🟡 `gap > 0` и `payoff_months <= 3`; 🔴 иначе (в том числе `payoff_months == None`);
  - строка 2 — счётчик с даты старта: получено, отложено, цель, разрыв;
  - строка 3 — траты недели против типичной и главная категория;
  - строка 4 — «до конца месяца можно потратить ещё X»;
  - не больше одного наблюдения — первый элемент `trends`, только если он есть;
  - при 🟡/🔴 — предложение в цифрах: «чтобы закрыть разрыв за 3 мес., тратьте до Y в неделю», `Y = (expected_monthly_salary × (1 − save_rate) − carried_gap / 3) / 4.33`, и «решать вам»;
  - если `cushion.below_min` — одна строка про подушку;
  - если до конца месяца ≤ 7 дней — напоминание о месячном разборе;
  - запреты: не разбирать отдельные покупки, не оценивать путешествия, хобби и здоровье, не додумывать причины.
  - Если артефакты доступны (Task 1) — подробный разбор публикуется приватной страницей, а в сообщение добавляется ссылка; иначе сообщение ≤ 12 строк без ссылки.
- [ ] **Step 2:** Локальный прогон навыка с отправкой в Telegram. Владелец смотрит текст и правит формулировки.
- [ ] **Step 3:** Предложить владельцу коммит и push (облачная задача берёт навык из GitHub).
- [ ] **Step 4:** Через `schedule` создать задачу «FinTree — неделя»: каждый понедельник в 09:00 по местному времени, промпт — «выполни навык fin-weekly», секреты `FINTREE_PAT` и `FIN_CONFIG_JSON` (содержимое `config.json`) — в настройках задачи.
- [ ] **Step 5:** Ручной запуск задачи → сообщение пришло в Telegram.

---

### Task 7: Навык `fin-payday` и облачная задача

**Files:**
- Create: `.claude/skills/fin-payday/SKILL.md`

- [ ] **Step 1: SKILL.md** — запустить `report`. Найти доходы категории `salary_category` за `[today − 2 дня, today]`. Если их нет — ничего не отправлять и закончить. Если есть — сообщение (`Plain`, ≤ 5 строк): «Пришло X. По правилу отложить Y (доля из конфига)», счётчик с даты старта, сколько можно потратить до конца месяца. Без советов по инструментам (раздел 7 спеки — это шаг 2).
- [ ] **Step 2:** Локальный прогон с `--today` = день после последней выплаты → сообщение о выплате.
- [ ] **Step 3:** Предложить коммит и push. Через `schedule` создать задачу «FinTree — зарплата»: на следующий день после каждого дня выплаты из конфига, 10:00 по местному времени (, чтобы операция успела попасть в бота), те же секреты.
- [ ] **Step 4:** Ручной запуск → без выплаты за последние 2 дня сообщения нет.

---

### Task 8: Навык `fin-monthly-review` (локальный диалог)

**Files:**
- Create: `.claude/skills/fin-monthly-review/SKILL.md`

- [ ] **Step 1: SKILL.md** — запускается владельцем в Claude Code. Шаги:
  1. Прочитать `.claude/finance/profile.md` и `config.json`, загрузить `secrets.env`.
  2. Запустить `report --today <последний день разбираемого месяца>` и получить ретроспективы за 3 последних месяца через `FinTreeClient.retrospectives()`.
  3. Вердикт первой строкой и цифры месяца (счётчик, разрыв, дни свободы, подушка).
  4. Положить рядом «план прошлого месяца» (`nextMonthPlan`) и факт. Не спорить.
  5. Не больше 5 вопросов по непонятным операциям и отклонениям — через `AskUserQuestion`. Выводов без ответа не делать.
  6. Собрать черновик полей ретроспективы (`conclusion`, `wins`, `savingsOpportunities`, `nextMonthPlan`) и спросить у владельца три оценки (`disciplineRating`, `impulseControlRating`, `confidenceRating`).
  7. Показать черновик. Только после «да» — `PUT /api/retrospectives/{YYYY-MM}`.
  8. Если в разговоре изменились обстоятельства или цели — предложить правку `profile.md` и/или `config.json` и применить после «да».
  - Ценности и запреты — из профиля и раздела 5 спеки (подталкивать тратить на здоровье и комфорт, не стыдить, без поштучного разбора покупок).
- [ ] **Step 2:** Пробный разбор октября 2026 вместе с владельцем. Ретроспективу записывать только с его согласия.
- [ ] **Step 3:** Предложить владельцу коммит.

---

## Самопроверка плана по спеке

- §5 (ритм, главная цифра, тон, тренды, предложения, сверка планов, дни свободы, задачи вне трат, испытательный срок) → Task 4, 6, 7, 8. Список «задач вне трат» (страховка, резидентство) ведётся в профиле, напоминания о нём — в Task 8, шаг 1.8.
- §6.1 → Task 2, 3. §6.2 → Task 4, 5. §6.3 → Task 6, 7, 8. §6.4 → Task 1 и Task 6, шаг 1.
- §7 (инвестиции) — вне этого плана, отдельный план шага 2.
- §9 (решения автора дизайна) → Task 4 (цель от категории «Зарплата», `amountInBaseCurrency`, без переводов), Task 7 (повтор на следующий день заменён одним запуском на день позже выплаты — без состояния между запусками), Task 6 (напоминание о месячном разборе).
