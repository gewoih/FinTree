"""Сборка единого JSON-отчёта, который читают навыки fin-weekly / fin-payday / fin-monthly-review."""

from dataclasses import asdict
from datetime import date, timedelta

from .config import Config
from .metrics import (
    Tx,
    carried_gap,
    fx_effect,
    category_history,
    month_key,
    month_outlook,
    ops_context,
    payoff_months,
    expected_monthly_salary,
    savings_counter,
    sustained_trends,
    typical_month_spend,
    week_operations,
    week_summary,
)

WEEKS_PER_MONTH = 4.33
RECENT_SALARY_DAYS = 3  # сегодня и 2 предыдущих дня



INVEST_MARKER = "[пополнения]"  # служебная строка плана пополнений в nextMonthPlan ретроспективы


def parse_invest_split(plan_text: str | None) -> list[tuple[str, int]] | None:
    """Доли пополнения из последней строки `[пополнения] Имя=17; Имя=83`; None, если строки нет или она испорчена."""
    if not isinstance(plan_text, str):
        return None
    lines = [ln.strip() for ln in plan_text.splitlines() if ln.strip().startswith(INVEST_MARKER)]
    if not lines:
        return None
    pairs: list[tuple[str, int]] = []
    for part in lines[-1][len(INVEST_MARKER):].split(";"):
        name, sep, value = part.rpartition("=")
        value = value.strip()
        if not sep or not name.strip() or not (value.isascii() and value.isdigit()):
            return None
        pairs.append((name.strip(), int(value)))
    return pairs if sum(p for _, p in pairs) == 100 else None


def _round(value):
    return round(value, 2) if isinstance(value, float) else value


def _plain(obj):
    if isinstance(obj, dict):
        return {k: _plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_plain(v) for v in obj]
    if isinstance(obj, date):
        return obj.isoformat()
    return _round(obj)


def build_report(txs: list[Tx], cfg: Config, today: date, invest_plan: str | None = None) -> dict:
    counter = savings_counter(txs, cfg, until=today)
    typical = typical_month_spend(txs, cfg)
    carried = carried_gap(txs, cfg, today)
    month = month_key(today)
    outlook = month_outlook(txs, cfg, today)
    # Отставание для вердикта: долг прошлых месяцев + перерасход текущего месяца относительно его цели.
    # counter.gap внутри месяца не учитывает ещё не пришедшую зарплату и поэтому для вердикта не годится.
    verdict_gap = carried + max(0.0, -outlook.can_spend)
    weekly_limit = (expected_monthly_salary(cfg, month) * (1 - cfg.save_rate) - verdict_gap / 3) / WEEKS_PER_MONTH
    recent_start = today - timedelta(days=RECENT_SALARY_DAYS - 1)
    recent_salary = sum(t.amount for t in txs if t.kind == "Income" and t.category == cfg.salary_category
                        and recent_start <= t.day <= today)

    fx = fx_effect(txs, cfg, today)
    split = parse_invest_split(invest_plan)
    invest_split = None if split is None else [
        {"name": name, "percent": percent, "amount": recent_salary * cfg.save_rate * percent / 100}
        for name, percent in split]

    return _plain({
        "today": today,
        "counter": asdict(counter),
        "carried_gap": carried,
        "verdict_gap": verdict_gap,
        "payoff_months": payoff_months(verdict_gap, cfg, month, typical),
        "suggested_weekly_limit": weekly_limit,
        "recent_salary": recent_salary,
        "recent_salary_to_save": recent_salary * cfg.save_rate,
        "outlook": asdict(outlook),
        "week": asdict(week_summary(txs, cfg, today)),
        "trends": [asdict(t) for t in sustained_trends(txs, cfg, today)],
        "typical_month": typical,
        "invest_split": invest_split,
        "fx": asdict(fx) if fx else None,
        "ops": [asdict(o) for o in week_operations(txs, today)],
        "ops_context": ops_context(txs, today),
        "category_history": category_history(txs, today),
        "rule_active": today >= cfg.start_date,
    })
