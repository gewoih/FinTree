---
name: fin-payday
description: Сообщение владельцу FinTree в Telegram после поступления зарплаты — сколько пришло и сколько отложить по правилу. Запускается облачной задачей на следующий день после дня выплаты; если выплаты нет — молчит.
---

# Сообщение в день зарплаты

Цифры не считаешь сам — только из отчёта `finmetrics`.

Каждый вызов оболочки самодостаточен: переменные между вызовами не сохраняются, поэтому всегда начинай команду с `cd` в папку скрипта, а файлы клади в `${TMPDIR:-/tmp}/fin-advisor`. Секреты и конфиг скрипт находит сам (env или `.claude/finance/`). Никогда не печатай значение `FINTREE_PAT` и не подставляй его в команды.

## 1. Отчёт

```bash
cd "$(git rev-parse --show-toplevel)/.claude/fin-advisor" && mkdir -p "${TMPDIR:-/tmp}/fin-advisor" \
  && python3 -m finmetrics report > "${TMPDIR:-/tmp}/fin-advisor/report.json"
```

- Ошибка отчёта → сообщение из одной строки «Сообщение о зарплате не собралось: …» (шаг 3).
- `recent_salary <= 0` (зарплаты за сегодня и 2 предыдущих дня нет) → **ничего не отправлять** и закончить.

## 2. Сообщение (обычный текст, не больше 5 строк, числа — из отчёта как есть)

1. «💰 Пришло `recent_salary`».
2. «По правилу отложить `recent_salary_to_save`».
3. Счётчик с даты старта: отложено `counter.saved`; `verdict_gap > 0` → «долг перед собой `verdict_gap`».
4. «До конца месяца можно потратить ещё `outlook.can_spend`».

Без советов, какие инструменты покупать (раздел 7 спеки — отдельный шаг). Без оценок покупок.

## 3. Отправить

Запиши текст в `${TMPDIR:-/tmp}/fin-advisor/message.txt`:

```bash
cd "$(git rev-parse --show-toplevel)/.claude/fin-advisor" \
  && python3 -m finmetrics notify --file "${TMPDIR:-/tmp}/fin-advisor/message.txt" \
  && rm -rf "${TMPDIR:-/tmp}/fin-advisor"
```
