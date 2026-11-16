"""Сборка единого JSON-отчёта, который читают навыки fin-weekly / fin-payday / fin-monthly-review."""

from dataclasses import asdict
from datetime import date, timedelta

from .config import Config
from .metrics import (
    Tx,
    carried_gap,
    cushion,
    fi_shift_days,
    month_key,
    month_outlook,
    payoff_months,
    expected_monthly_salary,
    savings_counter,
    sustained_trends,
    typical_month_spend,
    week_summary,
)

STALE_BALANCES_WARNING = (
    "Размер подушки взят из FinTree: переводы между счетами не записываются, балансы могут быть неточными."
)
WEEKS_PER_MONTH = 4.33
RECENT_SALARY_DAYS = 3  # сегодня и 2 предыдущих дня

MISSING_LIQUID_WARNING = "FinTree не вернул ликвидные активы — размер подушки неизвестен."


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


def build_report(txs: list[Tx], cfg: Config, today: date, liquid_assets: float | None) -> dict:
    counter = savings_counter(txs, cfg, until=today)
    typical = typical_month_spend(txs, cfg)
    carried = carried_gap(txs, cfg, today)
    month = month_key(today)
    outlook = month_outlook(txs, cfg, today)
    pillow = cushion(liquid_assets, typical, cfg, today)
    # Отставание для вердикта: долг прошлых месяцев + перерасход текущего месяца относительно его цели.
    # counter.gap внутри месяца не учитывает ещё не пришедшую зарплату и поэтому для вердикта не годится.
    verdict_gap = carried + max(0.0, -outlook.can_spend)
    weekly_limit = (expected_monthly_salary(cfg, month) * (1 - cfg.save_rate) - verdict_gap / 3) / WEEKS_PER_MONTH
    recent_start = today - timedelta(days=RECENT_SALARY_DAYS - 1)
    recent_salary = sum(t.amount for t in txs if t.kind == "Income" and t.category == cfg.salary_category
                        and recent_start <= t.day <= today)

    warnings = [STALE_BALANCES_WARNING]
    if liquid_assets is None:
        warnings.append(MISSING_LIQUID_WARNING)

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
        "fi_shift_days": fi_shift_days(cfg, verdict_gap, month),
        "cushion": asdict(pillow),
        "typical_month": typical,
        "warnings": warnings,
    })
