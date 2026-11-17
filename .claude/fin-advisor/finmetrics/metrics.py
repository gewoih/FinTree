"""Детерминированные расчёты советника. ИИ только объясняет эти цифры, но не считает их сам."""

import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from .config import Config

@dataclass(frozen=True)
class Tx:
    day: date
    kind: Literal["Income", "Expense"]
    amount: float
    category: str
    description: str
    currency: str = ""  # валюта операции (код); пусто — неизвестна
    original: float = 0.0  # сумма в этой валюте
    exact_rate: bool = False  # курс пересчёта в базовую валюту точный (не «приблизительный»)


@dataclass(frozen=True)
class Counter:
    salary: float
    income: float
    expenses: float
    saved: float
    target: float
    gap: float


@dataclass(frozen=True)
class Outlook:
    month_income: float
    month_expenses: float
    salary_received: float
    salary_expected_remaining: float
    month_target: float
    can_spend: float


@dataclass(frozen=True)
class Week:
    start: date
    end: date
    spent: float
    top: list[tuple[str, float]]


# --- разбор данных ---------------------------------------------------------------

def parse_transactions(raw: list[dict], categories: dict[str, str], tz_offset_hours: int) -> list[Tx]:
    tz = timezone(timedelta(hours=tz_offset_hours))
    result = []
    for item in raw:
        if item.get("isTransfer"):
            continue
        local = _parse_utc(item.get("occurredAt") or item.get("occuredAt")).astimezone(tz)
        result.append(Tx(
            day=local.date(),
            kind=item["type"],
            amount=float(item["amountInBaseCurrency"]),
            category=categories.get(item.get("categoryId") or "", "-"),
            description=(item.get("description") or "").strip(),
            currency=item.get("originalCurrencyCode") or "",
            original=float(item.get("originalAmount") or 0.0),
            exact_rate=item.get("isApproximateConversion") is False,
        ))
    return result


# --- вспомогательное -------------------------------------------------------------

_FRACTION = re.compile(r"\.(\d+)")


def _parse_utc(stamp: str) -> datetime:
    # Python 3.10 принимает только 3 или 6 знаков дробной части; .NET обрезает хвостовые нули.
    stamp = stamp.replace("Z", "+00:00")
    stamp = _FRACTION.sub(lambda m: "." + (m.group(1) + "000000")[:6], stamp, count=1)
    return datetime.fromisoformat(stamp)


def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _prev_month_end(d: date) -> date:
    return _month_start(d) - timedelta(days=1)


def _sum(txs, kind, pred=lambda t: True) -> float:
    return sum(t.amount for t in txs if t.kind == kind and pred(t))


def _between(txs, start: date, end: date) -> list[Tx]:
    return [t for t in txs if start <= t.day <= end]


# --- правило сбережений ------------------------------------------------------------

def expected_monthly_salary(cfg: Config, month: str) -> float:
    value = 0.0
    for start_month, monthly in cfg.expected_salary:
        if start_month <= month:
            value = monthly
    return value


def savings_counter(txs: list[Tx], cfg: Config, until: date) -> Counter:
    period = _between(txs, cfg.start_date, until)
    salary = _sum(period, "Income", lambda t: t.category == cfg.salary_category)
    income = _sum(period, "Income")
    expenses = _sum(period, "Expense")
    saved = income - expenses
    target = salary * cfg.save_rate
    return Counter(salary=salary, income=income, expenses=expenses, saved=saved, target=target, gap=target - saved)


def carried_gap(txs: list[Tx], cfg: Config, today: date) -> float:
    prev_end = _prev_month_end(today)
    if prev_end < cfg.start_date:
        return 0.0
    return savings_counter(txs, cfg, until=prev_end).gap


def month_outlook(txs: list[Tx], cfg: Config, today: date) -> Outlook:
    month = _between(txs, _month_start(today), today)
    month_income = _sum(month, "Income")
    month_expenses = _sum(month, "Expense")
    salary_received = _sum(month, "Income", lambda t: t.category == cfg.salary_category)
    remaining = max(0.0, expected_monthly_salary(cfg, month_key(today)) - salary_received)
    target = (salary_received + remaining) * cfg.save_rate
    return Outlook(
        month_income=month_income,
        month_expenses=month_expenses,
        salary_received=salary_received,
        salary_expected_remaining=remaining,
        month_target=target,
        can_spend=month_income + remaining - target - month_expenses,
    )


def week_summary(txs: list[Tx], cfg: Config, today: date) -> Week:
    end = today - timedelta(days=today.weekday() + 1)  # прошлое воскресенье
    start = end - timedelta(days=6)
    week = [t for t in _between(txs, start, end) if t.kind == "Expense"]
    by_category: dict[str, float] = defaultdict(float)
    for t in week:
        by_category[t.category] += t.amount
    top = sorted(by_category.items(), key=lambda kv: kv[1], reverse=True)[:3]
    return Week(start=start, end=end, spent=sum(t.amount for t in week), top=top)


HISTORY_WEEKS = 8
HISTORY_MAX_CATEGORIES = 12


@dataclass(frozen=True)
class WeekOp:
    day: date
    kind: str
    category: str
    amount: float
    description: str
    currency: str | None  # валюта операции, только если был пересчёт
    original: float | None  # сумма в этой валюте


def _last_full_week(today: date) -> tuple[date, date]:
    end = today - timedelta(days=today.weekday() + 1)  # прошлое воскресенье
    return end - timedelta(days=6), end


def week_operations(txs: list[Tx], today: date) -> list[WeekOp]:
    """Все операции прошлой полной недели (расходы и доходы) с заметками — сырьё для поиска паттернов."""
    start, end = _last_full_week(today)
    ops = []
    for t in sorted(_between(txs, start, end), key=lambda t: t.day):
        converted = t.original > 0 and abs(t.original - t.amount) > 0.5
        ops.append(WeekOp(t.day, t.kind, t.category, t.amount, t.description,
                          t.currency if converted else None, t.original if converted else None))
    return ops


CONTEXT_DAYS = 91  # 13 недель


def ops_context(txs: list[Tx], today: date, days: int = CONTEXT_DAYS) -> list[str]:
    """Операции за `days` дней до прошлой полной недели одной строкой каждая — контекст для поиска связей и серий.
    Формат: «2026-11-02 -1200 Кафе: кофе» (минус — расход, плюс — доход, заметка после двоеточия, если есть)."""
    week_start, _ = _last_full_week(today)
    lines = []
    for t in sorted(_between(txs, week_start - timedelta(days=days), week_start - timedelta(days=1)), key=lambda t: t.day):
        sign = "+" if t.kind == "Income" else "-"
        note = f": {t.description}" if t.description else ""
        lines.append(f"{t.day.isoformat()} {sign}{round(t.amount)} {t.category}{note}")
    return lines


def weekly_totals(txs: list[Tx], today: date, weeks: int = CONTEXT_DAYS // 7) -> list[dict]:
    """Расходы по каждой из `weeks` недель до прошлой полной недели (от старой к новой). Что считать «обычной» неделей,
    решает агент по этим фактам: скрипт никакой нормы не задаёт."""
    last_start, _ = _last_full_week(today)
    first_start = last_start - timedelta(days=7 * weeks)
    rows = []
    for i in range(weeks):
        start = first_start + timedelta(days=7 * i)
        spent = sum(t.amount for t in _between(txs, start, start + timedelta(days=6)) if t.kind == "Expense")
        rows.append({"week_start": start.isoformat(), "spent": spent})
    return rows


def category_history(txs: list[Tx], today: date, weeks: int = HISTORY_WEEKS) -> dict:
    """Число и сумма расходов по категориям за последние `weeks` полных недель (от старой к новой), крупнейшие категории."""
    last_start, last_end = _last_full_week(today)
    first_start = last_start - timedelta(days=7 * (weeks - 1))
    counts: dict[str, list[int]] = defaultdict(lambda: [0] * weeks)
    sums: dict[str, list[float]] = defaultdict(lambda: [0.0] * weeks)
    for t in _between(txs, first_start, last_end):
        if t.kind != "Expense":
            continue
        index = (t.day - first_start).days // 7
        counts[t.category][index] += 1
        sums[t.category][index] += t.amount
    top = sorted(sums, key=lambda c: sum(sums[c]), reverse=True)[:HISTORY_MAX_CATEGORIES]
    return {
        "weeks": [(first_start + timedelta(days=7 * i)).isoformat() for i in range(weeks)],
        "categories": {c: {"count": counts[c], "spent": sums[c]} for c in top},
    }


FX_WINDOW_DAYS = 28
FX_MIN_OPERATIONS = 3
FX_MIN_CHANGE_PCT = 2.0
FX_MIN_EFFECT = 1000.0


@dataclass(frozen=True)
class FxEffect:
    currency: str
    rate_now: float
    rate_prev: float
    change_pct: float
    spent_foreign: float
    effect_rub: float


def _exact_rate(txs: list[Tx], currency: str, start: date, end: date) -> float | None:
    """Средний курс по точным пересчётам расходов в валюте за период; None, если операций мало."""
    ops = [t for t in _between(txs, start, end)
           if t.kind == "Expense" and t.currency == currency and t.exact_rate and t.original > 0]
    if len(ops) < FX_MIN_OPERATIONS:
        return None
    return sum(t.amount for t in ops) / sum(t.original for t in ops)


def _main_foreign_currency(txs: list[Tx], start: date, end: date) -> str | None:
    """Иностранная валюта с наибольшими расходами за период (операция «иностранная», если её пересчитывали)."""
    spent: dict[str, float] = defaultdict(float)
    for t in _between(txs, start, end):
        if t.kind == "Expense" and t.currency and t.original > 0 and abs(t.original - t.amount) > 0.5:
            spent[t.currency] += t.amount
    return max(spent, key=spent.__getitem__) if spent else None


def fx_effect(txs: list[Tx], cfg: Config, today: date) -> FxEffect | None:
    """Как изменение курса главной иностранной валюты недели повлияло на траты в ней (по точным курсам, 4 недели к
    предыдущим 4). Валюта определяется по операциям прошлой недели, настроек не требуется.
    None — иностранных трат на неделе нет, данных мало или эффект слишком мал, чтобы о нём говорить."""
    week_end = today - timedelta(days=today.weekday() + 1)
    week_start = week_end - timedelta(days=6)
    currency = _main_foreign_currency(txs, week_start, week_end)
    if currency is None:
        return None
    now_start = week_end - timedelta(days=FX_WINDOW_DAYS - 1)
    prev_end = now_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=FX_WINDOW_DAYS - 1)

    rate_now = _exact_rate(txs, currency, now_start, week_end)
    rate_prev = _exact_rate(txs, currency, prev_start, prev_end)
    if rate_now is None or rate_prev is None:
        return None

    spent_foreign = sum(t.original for t in _between(txs, week_start, week_end)
                        if t.kind == "Expense" and t.currency == currency)
    change_pct = (rate_now / rate_prev - 1) * 100
    effect = spent_foreign * (rate_now - rate_prev)
    if abs(change_pct) < FX_MIN_CHANGE_PCT or abs(effect) < FX_MIN_EFFECT:
        return None
    return FxEffect(currency, rate_now, rate_prev, change_pct, spent_foreign, effect)


def _last_full_months(today: date, count: int) -> list[str]:
    months, cursor = [], _prev_month_end(today)
    for _ in range(count):
        months.append(month_key(cursor))
        cursor = _prev_month_end(cursor)
    return list(reversed(months))


# --- срок до финансовой независимости (используется разбором портфеля) --------------

def months_to_fi(cfg: Config, capital: float, monthly_saving: float) -> float:
    rate = cfg.fi.real_return / 12
    for month in range(1, 12 * 100 + 1):
        before = capital
        capital = capital * (1 + rate) + monthly_saving
        if capital >= cfg.fi.target_capital:
            return month - 1 + (cfg.fi.target_capital - before) / (capital - before)
        if month % 12 == 0:
            monthly_saving *= 1 + cfg.fi.salary_growth
    return float(12 * 100)
