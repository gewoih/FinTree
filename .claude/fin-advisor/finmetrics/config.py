"""Конфиг советника. Личные значения живут в .claude/finance/config.json (gitignored)
или в переменной окружения FIN_CONFIG_JSON (облачные задачи)."""

import json
import os
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class FiParams:
    target_capital: float
    start_capital: float
    real_return: float
    salary_growth: float


@dataclass(frozen=True)
class Config:
    save_rate: float
    start_date: date
    tz_offset_hours: int
    paydays: list[int]
    salary_category: str
    expected_salary: list[tuple[str, float]]
    baseline_months: list[str]
    fi: FiParams
    fx_currency: str | None = None  # валюта, курс которой показываем в сводке; None — выключено


def load_config(path: str | None) -> Config:
    if path:
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
    else:
        env = os.environ.get("FIN_CONFIG_JSON")
        if not env:
            raise SystemExit("Нет конфига: передайте --config PATH или задайте FIN_CONFIG_JSON")
        raw = json.loads(env)
    return _from_dict(raw)


def _from_dict(raw: dict) -> Config:
    fi = raw["fi"]
    return Config(
        save_rate=float(raw["save_rate"]),
        start_date=date.fromisoformat(raw["start_date"]),
        tz_offset_hours=int(raw.get("tz_offset_hours", 5)),
        paydays=[int(d) for d in raw.get("paydays", [])],
        salary_category=raw["salary_category"],
        expected_salary=sorted((e["from"], float(e["monthly"])) for e in raw.get("expected_salary", [])),
        baseline_months=list(raw.get("baseline_months", [])),
        fi=FiParams(
            target_capital=float(fi["target_capital"]),
            start_capital=float(fi["start_capital"]),
            real_return=float(fi["real_return"]),
            salary_growth=float(fi["salary_growth"]),
        ),
        fx_currency=raw.get("fx_currency") or None,
    )
