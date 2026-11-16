# Инвестиционный модуль (шаг 2) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** раз в месяц превращать скриншоты портфеля в проверенный снимок позиций и детерминированно считать по
политике владельца отклонения, пополнения, сценарии; в дни зарплаты показывать, куда направить отложенное.

**Architecture:** новый пакет `finportfolio` рядом с `finmetrics` (Python без зависимостей). Скриншоты читает агент
в локальной сессии и пишет JSON-снимок; все цифры считает скрипт. Доли пополнения на месяц записываются
машиночитаемой строкой в поле `nextMonthPlan` ретроспективы FinTree; облачный `fin-payday` читает её через
существующий `GET /api/retrospectives/{month}`. Бэкенд не меняется.

**Tech Stack:** Python 3.11 (stdlib, `unittest`), навыки Claude Code (`SKILL.md`), API FinTree с личным токеном.

**Spec:** `docs/superpowers/specs/2026-11-16-investment-module-design.md` (и раздел 5 спеки
`2026-11-16-personal-finance-advisor-design.md` — тон и поведение советника).

## Global Constraints

- Репозиторий публичный: в коде, тестах и примерах — только выдуманные числа. Личные файлы живут в
  `.claude/finance/` (gitignored): `policy.json`, `positions/YYYY-MM.json`, `decisions.md`.
- Без внешних зависимостей; Python 3.11; тесты — `unittest`.
- Запуск всех тестов: `cd .claude/fin-advisor && python3 -m unittest discover -s tests -t .` (сейчас 42 теста, все зелёные).
- Не запускать `dotnet build/test/run`, не трогать EF-миграции. Бэкенд в этом плане не меняется.
- **Не выполнять `git add` / `git commit`** — в конце каждой задачи остановиться и показать diff; коммит только
  после явного согласия владельца.
- Перед правкой существующих символов (`build_report`, `_months_to_fi`, `FinTreeClient`) — `gitnexus_impact`
  (правило `CLAUDE.md`); если GitNexus недоступен — поиск использований по коду и сказать об этом.
- Сообщения об ошибках и тексты навыков — по-русски. Никогда не печатать `FINTREE_PAT`.
- Скриншоты не сохраняются нигде; сохраняются только проверенные числа.
- Найденный по ходу техдолг — строкой в `TODO.md`.

## Review Focus

1. Сумма позиций счёта не сходится с итогом на скриншоте (ошибка распознавания) → `check` падает с понятной
   ошибкой, расчёт не идёт. Тест — задача 1.
2. В снимке позиция с неизвестным классом или валютой без курса (новая бумага, обрезанный скриншот) → ошибка с
   названием позиции, а не тихий пропуск. Тест — задача 1.
3. Итог счёта на скриншоте не виден (`stated_total: null`, типично для биржевых аккаунтов) → расчёт идёт, но в `warnings`
   есть строка «итог не сверён». Тест — задача 1.
4. Пополнение 0, отрицательное или меньше дефицита резерва → всё уходит в резерв / пустой план, без деления на
   ноль. Тест — задача 3.
5. Строка плана в ретроспективе отсутствует, испорчена или устарела (старше двух месяцев) → `invest_split: null`,
   `fin-payday` пишет, что плана нет, и не падает. Тест — задача 6.

## Файлы

| Файл | Ответственность |
|---|---|
| `.claude/fin-advisor/finportfolio/model.py` | типы, загрузка и проверка политики и снимка |
| `.claude/fin-advisor/finportfolio/calc.py` | доли, отклонения, статусы, план пополнения |
| `.claude/fin-advisor/finportfolio/scenarios.py` | просадка, налог при продаже, срок до независимости |
| `.claude/fin-advisor/finportfolio/__main__.py` | CLI `check` / `report` |
| `.claude/fin-advisor/policy.example.json`, `snapshot.example.json` | примеры с выдуманными числами |
| `.claude/fin-advisor/tests/test_portfolio_*.py` | тесты |
| `.claude/fin-advisor/finmetrics/{api,report,__main__,metrics}.py` | чтение плана пополнений для `fin-payday` |
| `.claude/skills/fin-portfolio/SKILL.md` | приём скриншотов, рекомендации, журнал |
| `.claude/skills/fin-payday/SKILL.md`, `fin-monthly-review/SKILL.md` | обновление под новый модуль |

## Форматы данных (общие для всех задач)

`policy.json`:

```json
{
  "reserve_target": 100000,
  "sale_threshold_pp": 10,
  "sale_fix_months": 12,
  "issuer_limit": 0.05,
  "classes": [
    {"id": "a", "name": "Акции", "target": 0.5, "tolerance_pp": 5, "new_money": true, "never_sell": false,
     "stress_drop": 0.35, "expected_real_return": 0.06},
    {"id": "b", "name": "Облигации", "target": 0.3, "tolerance_pp": 3, "new_money": true, "never_sell": false,
     "stress_drop": 0.10, "expected_real_return": 0.02},
    {"id": "c", "name": "Крипта", "target": 0.2, "tolerance_pp": 3, "new_money": false, "never_sell": true,
     "stress_drop": 0.60, "expected_real_return": 0.0}
  ],
  "tax": {"default_rate": 0.13, "alt_rate": 0.30, "status": "не проверено", "source": "", "checked": "2026-01-01"}
}
```

Снимок `positions/YYYY-MM.json` (все `value`/`cost`/`stated_total` — в валюте счёта):

```json
{
  "date": "2026-01-31",
  "fx": {"USD": 80.0},
  "accounts": [
    {"name": "Счёт 1", "currency": "RUB", "stated_total": 780000,
     "positions": [
       {"name": "Фонд ликвидности", "ticker": "LQ", "class": "reserve", "value": 80000, "cost": null, "issuer": null},
       {"name": "Фонд акций", "ticker": "EQ", "class": "a", "value": 400000, "cost": 350000, "issuer": null},
       {"name": "Облигация X", "ticker": "X1", "class": "b", "value": 300000, "cost": null, "issuer": "X"}
     ]},
    {"name": "Биржа", "currency": "USD", "stated_total": null,
     "positions": [
       {"name": "BTC", "ticker": "BTC", "class": "c", "value": 3750, "cost": null, "issuer": null},
       {"name": "Заблокировано", "ticker": "ZZ", "class": "frozen", "value": 625, "cost": null, "issuer": null}
     ]}
  ]
}
```

Зарезервированные классы: `reserve` (резерв) и `frozen` (учёт в сумме, в долях не участвует). Эталон для тестов
(в рублях): резерв 80 000, a 400 000, b 300 000, c 300 000, frozen 50 000; долгосрочный капитал L = 1 000 000;
всего 1 130 000.

---

### Task 1: Модель, загрузка и проверка

**Files:**
- Create: `.claude/fin-advisor/finportfolio/__init__.py` (пустой), `finportfolio/model.py`,
  `policy.example.json`, `snapshot.example.json` (содержимое — из раздела «Форматы данных»)
- Test: `tests/test_portfolio_model.py`

**Interfaces — Produces:**
- `class PortfolioError(ValueError)`
- `@dataclass(frozen=True) AssetClass(id, name, target, tolerance_pp, new_money, never_sell, stress_drop, expected_real_return)`
- `@dataclass(frozen=True) Tax(default_rate, alt_rate, status, source, checked)`
- `@dataclass(frozen=True) Policy(reserve_target, sale_threshold_pp, sale_fix_months, issuer_limit, classes: tuple[AssetClass, ...], tax: Tax)`
- `@dataclass(frozen=True) Position(account, name, ticker, cls, value_rub, cost_rub: float | None, issuer: str | None)`
- `@dataclass(frozen=True) Snapshot(day: date, positions: tuple[Position, ...], warnings: tuple[str, ...])`
- `policy_from_dict(raw: dict) -> Policy`, `load_policy(path) -> Policy`
- `snapshot_from_dict(raw: dict, policy: Policy) -> Snapshot`, `load_snapshot(path, policy) -> Snapshot`
- `RESERVE = "reserve"`, `FROZEN = "frozen"`

Правила проверки (каждое — `PortfolioError` с названием счёта/позиции в тексте):
сумма `target` классов = 1 ± 0.001; id классов уникальны и не равны `reserve`/`frozen`; `class` позиции — id из
политики или зарезервированный; валюта счёта `RUB` или есть в `fx`; `value >= 0`; у счёта есть позиции;
`|сумма позиций − stated_total| <= max(10, 0.001 × stated_total)` в валюте счёта. `stated_total: null` → не
ошибка, а строка в `warnings`: `«<счёт>: итог не сверён»`.

- [ ] **Step 1: тесты (падают)** — `test_example_files_load` (эталон: 5 позиций, `value_rub` BTC = 300000,
  одно предупреждение про «Биржа»), `test_targets_must_sum_to_one`, `test_unknown_class_names_position`
  (в тексте ошибки есть имя позиции), `test_missing_fx_rate`, `test_total_mismatch` (stated_total 790000 →
  ошибка с именем счёта), `test_total_within_tolerance` (780005 → ок), `test_negative_value`, `test_empty_account`.
- [ ] **Step 2:** запустить `python3 -m unittest tests.test_portfolio_model -v` → FAIL (модуля нет).
- [ ] **Step 3:** реализовать `model.py` по интерфейсам выше.
- [ ] **Step 4:** тесты зелёные; полный набор зелёный.
- [ ] **Step 5:** остановиться, показать diff (без коммита).

### Task 2: Доли, отклонения, статусы

**Files:** Create `finportfolio/calc.py`; Test `tests/test_portfolio_calc.py`

**Interfaces:**
- Consumes: `Policy`, `Snapshot`, `RESERVE`, `FROZEN` из задачи 1.
- Produces:
  - `@dataclass(frozen=True) ClassState(id, name, value, share, target, deviation_pp, status, months_to_target: float | None)`
  - `@dataclass(frozen=True) Allocation(total, reserve, frozen, long_term, classes: tuple[ClassState, ...], issuers_over_limit: tuple[tuple[str, float], ...])`
  - `allocation(snapshot: Snapshot, policy: Policy, monthly_invest: float = 0.0) -> Allocation`

Правила: `share = value / long_term` (если `long_term == 0` → все доли 0, статусы `ok`);
`deviation_pp = (share − target) × 100`. Статус: `ok` при `|deviation_pp| <= tolerance_pp`, иначе `under` / `over`.
Для `over`: `months_to_target = (value / (target + tolerance_pp/100) − long_term) / monthly_invest`
(`None`, если `monthly_invest <= 0`). `sale_candidate` вместо `over`, если одновременно: `deviation_pp >
sale_threshold_pp`, класс не `never_sell`, и `months_to_target` равен `None` или `> sale_fix_months`.
`issuers_over_limit` — эмитенты (поле `issuer`, не `None`) с долей в `long_term` больше `issuer_limit`.

- [ ] **Step 1: тесты (падают)** на эталоне:
  `test_totals` (total 1130000, reserve 80000, frozen 50000, long_term 1000000);
  `test_statuses` (a: share 0.4, deviation −10.0, `under`; b: `ok`; c: +10.0, `over`, не `sale_candidate` —
  `never_sell`); `test_months_to_target` (c при `monthly_invest=100000` ≈ 3.04);
  `test_sale_candidate` (политика, где c без `never_sell`, значение c = 400000, `monthly_invest=20000` →
  `sale_candidate`; при `monthly_invest=100000` → `over`);
  `test_issuer_over_limit` (эмитент «X» 0.3 > 0.05 → в списке); `test_empty_long_term_no_division`.
- [ ] **Step 2:** запустить → FAIL. **Step 3:** реализовать. **Step 4:** зелёные. **Step 5:** остановиться, diff.

### Task 3: План пополнения

**Files:** Modify `finportfolio/calc.py`; Test `tests/test_portfolio_calc.py`

**Interfaces — Produces:**
- `@dataclass(frozen=True) SplitItem(id, name, amount, percent: int)`
- `@dataclass(frozen=True) Split(contribution, to_reserve, reserve_surplus, items: tuple[SplitItem, ...], marker: str | None)`
- `contribution_split(alloc: Allocation, policy: Policy, contribution: float) -> Split`
- `SPLIT_MARKER = "[пополнения]"`, `RESERVE_NAME = "Резерв"`

Алгоритм: `to_reserve = min(contribution, max(0, reserve_target − reserve))`; остаток `R` делится между классами
с `new_money` пропорционально `shortfall_i = max(0, target_i × (long_term + R) − value_i)`; если сумма shortfall
равна 0 — пропорционально `target` среди классов с `new_money`. `reserve_surplus = max(0, reserve − reserve_target)`
(только показывается, в план не входит). `items` включает резерв (id `reserve`), если `to_reserve > 0`, и классы
с суммой > 0. `percent` — целые, сумма ровно 100 (метод наибольших остатков). `marker` =
`"[пополнения] Резерв=17; Акции=69; Облигации=14"`; при `contribution <= 0` — `items` пусты, `marker` `None`.

- [ ] **Step 1: тесты (падают)** на эталоне:
  `test_split_reference` (contribution 120000 → to_reserve 20000; Акции ≈ 83333.33; Облигации ≈ 16666.67;
  Крипта отсутствует; проценты 17/69/14; `marker == "[пополнения] Резерв=17; Акции=69; Облигации=14"`);
  `test_contribution_below_reserve_deficit` (10000 → всё в резерв, marker `"[пополнения] Резерв=100"`);
  `test_zero_and_negative_contribution` (пустой план, `marker is None`);
  `test_all_at_target_splits_by_target` (нет недобора → по `target` среди `new_money`);
  `test_reserve_surplus_reported` (резерв 130000 → surplus 30000, to_reserve 0).
- [ ] **Step 2:** FAIL. **Step 3:** реализовать. **Step 4:** зелёные. **Step 5:** остановиться, diff.

### Task 4: Сценарии

**Files:** Create `finportfolio/scenarios.py`; Modify `finmetrics/metrics.py` (переименовать `_months_to_fi` →
`months_to_fi`, обновить два вызова в `fi_shift_days`); Test `tests/test_portfolio_scenarios.py`

**Interfaces:**
- Consumes: `Allocation`, `Policy`, `Snapshot`; `finmetrics.metrics.months_to_fi(cfg, capital, monthly_saving)`,
  `finmetrics.config.Config` / `FiParams`.
- Produces:
  - `stress(alloc: Allocation, policy: Policy) -> dict` → `{"loss": float, "long_term_loss_pct": float, "total_loss_pct": float}`
  - `sale_tax(snapshot: Snapshot, policy: Policy) -> list[dict]` → по каждой позиции не из `reserve`/`frozen`:
    `{"name", "gain", "tax_default", "tax_alt"}`; при `cost_rub is None` все три — `None`; убыток → налог 0.
  - `fi_compare(cfg: Config, alloc: Allocation, policy: Policy, monthly_saving: float) -> dict` →
    `{"current_return", "target_return", "years_current", "years_target"}`: доходность — взвешенная
    `expected_real_return` по текущим и по целевым долям; срок — `months_to_fi` с `dataclasses.replace(cfg,
    fi=replace(cfg.fi, real_return=...))` и `capital = alloc.total`, делённый на 12.

- [ ] **Step 1: тесты (падают):** `test_stress_reference` (эталон: loss 350000, long_term 35.0, total ≈ 30.97);
  `test_sale_tax` (value 400000, cost 350000 → gain 50000, tax_default 6500, tax_alt 15000);
  `test_sale_tax_unknown_cost_is_none`; `test_sale_tax_loss_is_zero`;
  `test_fi_compare_returns` (эталон: current_return = 0.4×0.06+0.3×0.02 = 0.03; target_return = 0.036;
  `years_target < years_current`).
- [ ] **Step 2:** FAIL. **Step 3:** реализовать; **Step 4:** все тесты (включая старые 42) зелёные.
- [ ] **Step 5:** остановиться, diff.

### Task 5: CLI

**Files:** Create `finportfolio/__main__.py`; Test `tests/test_portfolio_cli.py`

**Interfaces — Produces:**
- `python3 -m finportfolio check SNAPSHOT [--policy PATH]` → таблица позиций по счетам с итогами и предупреждения
  (обычный текст), код 0; ошибка проверки → текст в stderr, код 2.
- `python3 -m finportfolio report SNAPSHOT --contribution N [--policy PATH] [--config PATH]` → JSON в stdout с
  ключами ровно: `date, total, reserve, frozen, long_term, classes, issuers_over_limit, split, stress, sale_tax,
  fi, tax, warnings`. `reserve` = `{"value", "target", "surplus"}`; `tax` — объект из политики;
  `monthly_invest` для `allocation` = `contribution − split.to_reserve`.
- `main(argv: list[str] | None = None) -> int`. Политика по умолчанию — `.claude/finance/policy.json`
  (`finmetrics.__main__.FINANCE_DIR`); конфиг — как в `finmetrics` (`load_config`, `_config_path`).
  Токен и сеть не нужны.

- [ ] **Step 1: тесты (падают):** `test_report_keys_and_json` (на файлах-примерах и `config.example.json`,
  `--contribution 120000`; набор ключей; `split.marker` как в задаче 3; `json.dumps` проходит);
  `test_check_ok_returns_zero`; `test_check_mismatch_returns_two` (временный снимок с неверным итогом → 2,
  stderr содержит имя счёта); `test_missing_policy_file_returns_two`.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать. **Step 4:** зелёные. **Step 5:** остановиться, diff.

### Task 6: План пополнений в отчёте `finmetrics` (для `fin-payday`)

**Files:** Modify `finmetrics/api.py`, `finmetrics/report.py`, `finmetrics/__main__.py`;
Test `tests/test_api.py`, `tests/test_report.py`

**Interfaces — Produces:**
- `FinTreeClient.retrospective(month: str) -> dict | None` — `GET /api/retrospectives/{month}`; 404 → `None`
  (для этого `ApiError` получает атрибут `status: int | None`).
- `parse_invest_split(plan_text: str | None) -> list[tuple[str, int]] | None` в `report.py`: ищет последнюю
  строку, начинающуюся с `[пополнения]`; формат `Имя=целое` через `;`; `None`, если строки нет, формат нарушен
  или сумма процентов ≠ 100.
- `build_report(txs, cfg, today, liquid_assets, invest_plan: str | None = None)` — новый ключ `invest_split`:
  `None` либо список `{"name", "percent", "amount"}`, где `amount = recent_salary_to_save × percent / 100`.
- `_report` в `__main__.py`: берёт `nextMonthPlan` ретроспективы прошлого месяца; если её нет или в ней нет
  строки плана — позапрошлого; старше не смотрит.

- [ ] **Step 1: тесты (падают):** `test_parse_invest_split_ok` (`"Текст\n[пополнения] Резерв=17; Акции=69;
  Облигации=14"` → три пары); `test_parse_invest_split_bad` (нет строки; `"[пополнения] Акции=abc"`; сумма 90 →
  `None`); `test_report_invest_split_amounts` (зарплата 200000 сегодня, save_rate из `make_cfg()` → суммы по
  процентам); `test_report_invest_split_none_without_plan`; обновить набор ключей в
  `test_report_has_all_sections_and_is_json` (+ `invest_split`); `test_retrospective_404_returns_none` и
  `test_retrospective_returns_dict` в `test_api.py` (по образцу существующих тестов клиента).
- [ ] **Step 2:** FAIL. **Step 3:** реализовать. **Step 4:** все тесты зелёные. **Step 5:** остановиться, diff.

### Task 7: Навыки и личные файлы

**Files:**
- Create: `.claude/skills/fin-portfolio/SKILL.md`; `.claude/finance/policy.json` (приватно, из
  `.claude/finance/policy.md` (доли, допуски, резерв, пороги, лимит эмитента, флаги классов и налоговая ставка по
  умолчанию — только оттуда, в публичный план личные значения не копируются);
  `stress_drop` и `expected_real_return` — допущения, показать владельцу и записать после «да»)
- Modify: `.claude/skills/fin-payday/SKILL.md`, `.claude/skills/fin-monthly-review/SKILL.md`,
  `.claude/finance/HANDOFF.md`

`fin-portfolio/SKILL.md` — шаги:
1. Прочитать `profile.md`, `policy.md`, прошлый снимок (если есть).
2. Попросить скриншоты всех счетов; извлечь позиции в `.claude/finance/positions/YYYY-MM.json` по формату плана.
   Нечитаемое, новый тикер, обрезанный список — спросить, не додумывать. Класс новой бумаги — спросить.
3. `python3 -m finportfolio check …` → показать таблицу; при ошибке сверки — перечитать скриншот или спросить.
   Запись и расчёт — только после «да». Скриншоты не сохранять.
4. `python3 -m finportfolio report … --contribution <ожидаемое к откладыванию за месяц из отчёта finmetrics>`.
5. Разговор: отклонения и статусы; куда идут новые деньги; `reserve_surplus`; эмитенты сверх лимита; просадка;
   срок до независимости. Числа — только из отчёта.
6. Рекомендации — формат «вывод → допущения → цифры → что изменит вывод → риск, если агент неправ»; сверять со
   списком «никогда не покупаю»; если опора на ставку со статусом «не проверено» — сказать это; продажу
   предлагать только при `sale_candidate` и с расчётом `sale_tax`.
7. Строку `split.marker` добавить последней строкой в `nextMonthPlan` ретроспективы (через шаг 3 навыка
   `fin-monthly-review`).
8. Журнал: запись в `.claude/finance/decisions.md` (дата, решение, почему, что изменит мнение) — только после
   явного «записать».
9. В феврале, мае, августе, ноябре — валидация политики: по открытым источникам проверить допущения
   (геополитика и инфраструктурные риски, рынок, ставки, налоги, комиссии фондов); итог по умолчанию «без
   изменений»; предложение изменить — с аргументами и ссылками; движение рынка само по себе не повод.

`fin-payday/SKILL.md`: после строки про «отложить» — если `invest_split` не `null`: «Куда: <name> <amount>, …»
(лимит строк поднять с 5 до 6); если `null`: «Плана пополнений нет — появится после месячного разбора».
Убрать фразу «Без советов, какие инструменты покупать…».

`fin-monthly-review/SKILL.md`: в раздел 0 добавить `policy.md`; после раздела 2 — «Портфель: выполнить навык
`fin-portfolio`»; в разделе 3 — последней строкой `nextMonthPlan` идёт `split.marker`; в «Нельзя» заменить
запрет на рекомендации на «рекомендовать вопреки политике и списку „никогда не покупаю“».

- [ ] **Step 1:** написать `fin-portfolio/SKILL.md` и правки двух навыков.
- [ ] **Step 2:** показать владельцу допущения `stress_drop` / `expected_real_return`; после «да» создать
  `policy.json`; `python3 -c "from finportfolio.model import load_policy; load_policy('../finance/policy.json')"` → без ошибок.
- [ ] **Step 3:** сквозная проверка: собрать снимок из данных профиля на 16.11.2026 (как если бы пришли
  скриншоты), `check` → `report` → показать владельцу результат. Убедиться: `git status` не показывает файлов
  из `.claude/finance/`.
- [ ] **Step 4:** спросить владельца и после «да» обновить промпт облачной задачи
  сообщения после зарплаты (убрать строку «Никаких советов по конкретным инвестиционным инструментам»).
- [ ] **Step 5:** обновить `HANDOFF.md`; остановиться, показать diff; коммит и пуш — только после согласия
  (облачный `fin-payday` увидит изменения только после пуша в `master`).

## Решения автора плана

- Если плана пополнений в ретроспективе нет, `fin-payday` не делит сумму сам (целевые доли в облако не
  выгружаются — меньше личных данных в окружении). План живёт до двух месяцев.
- Излишек резерва (`reserve_surplus`) в автоматический план не входит: его перевод — продажа паёв, решение
  владельца на месячном разборе.
- `fin-portfolio` — отдельный навык, вызывается из `fin-monthly-review`; можно запускать и самостоятельно.
- Курсы валют — со скриншотов (поле `fx` снимка); рыночные цены для сценариев не нужны.
- Допуск сверки итога: `max(10, 0.1%)` в валюте счёта — покрывает округление на скриншоте.
