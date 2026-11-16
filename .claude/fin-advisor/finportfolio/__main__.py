"""CLI портфеля.

python3 -m finportfolio check SNAPSHOT [--policy PATH]                       # проверить снимок, показать таблицу
python3 -m finportfolio report SNAPSHOT --contribution N [--policy PATH] [--config PATH]   # JSON с расчётом

Политика по умолчанию — .claude/finance/policy.json. Конфиг — как у finmetrics (нужен для срока до независимости).
Токен и сеть не нужны: всё считается из локальных файлов.
"""

import argparse
import json
import sys
from dataclasses import asdict
from datetime import date

from finmetrics.__main__ import FINANCE_DIR, _config_path
from finmetrics.config import load_config

from .calc import allocation, contribution_split
from .model import PortfolioError, load_policy, load_snapshot
from .scenarios import fi_compare, sale_tax, stress

DEFAULT_POLICY = FINANCE_DIR / "policy.json"
DIGITS = 4  # доли — дроби, двух знаков мало (0.4194 → 0.42 исказило бы процент)


def _plain(obj):
    if isinstance(obj, dict):
        return {k: _plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_plain(v) for v in obj]
    if isinstance(obj, date):
        return obj.isoformat()
    return round(obj, DIGITS) if isinstance(obj, float) else obj


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="finportfolio")
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check", help="проверить снимок и показать позиции")
    check.add_argument("snapshot")
    check.add_argument("--policy", default=str(DEFAULT_POLICY))
    report = sub.add_parser("report", help="посчитать доли, пополнения и сценарии (JSON)")
    report.add_argument("snapshot")
    report.add_argument("--contribution", type=float, required=True, help="сумма к откладыванию за месяц, ₽")
    report.add_argument("--policy", default=str(DEFAULT_POLICY))
    report.add_argument("--config", help="путь к config.json")
    args = parser.parse_args(argv)

    try:
        policy = load_policy(args.policy)
        snapshot = load_snapshot(args.snapshot, policy)
        if args.command == "check":
            print(_table(snapshot))
            return 0
        print(json.dumps(_report(snapshot, policy, args), ensure_ascii=False, indent=2))
        return 0
    except (PortfolioError, ValueError, OSError) as e:
        print(str(e), file=sys.stderr)
        return 2


def _num(value: float) -> str:
    return f"{value:,.2f}".rstrip("0").rstrip(".").replace(",", " ")


def _rub(value: float) -> str:
    return f"{_num(round(value))} ₽"


def _table(snapshot) -> str:
    """Таблица для сверки владельцем: по каждому счёту — валюта, курс, итог на скриншоте и сумма позиций."""
    lines = [f"Снимок на {snapshot.day.isoformat()}"]
    for acc in snapshot.accounts:
        rate = "" if acc.rate == 1 else f", курс {acc.rate:g}"
        stated = "итог на скриншоте не виден" if acc.stated_total is None else f"итог на скриншоте {_num(acc.stated_total)}"
        lines.append(f"\n{acc.name} ({acc.currency}{rate}): {stated}, сумма позиций {_num(acc.total)}")
        for p in (p for p in snapshot.positions if p.account == acc.name):
            native = "" if p.currency == "RUB" else f"{_num(p.value_native)} {p.currency} = "
            lines.append(f"  {p.name} ({p.ticker}) · {p.cls} · {native}{_rub(p.value_rub)}")
    lines.append(f"\nИтого {_rub(sum(p.value_rub for p in snapshot.positions))}")
    lines.extend(f"⚠ {w}" for w in snapshot.warnings)
    return "\n".join(lines)


def _report(snapshot, policy, args) -> dict:
    cfg = load_config(_config_path(args.config))
    split = contribution_split(allocation(snapshot, policy), policy, args.contribution)
    alloc = allocation(snapshot, policy, monthly_invest=args.contribution)
    return _plain({
        "date": snapshot.day,
        "total": alloc.total,
        "reserve": {"value": alloc.reserve, "target": policy.reserve_target, "surplus": split.reserve_surplus},
        "frozen": alloc.frozen,
        "long_term": alloc.long_term,
        "classes": [asdict(c) for c in alloc.classes],
        "issuers_over_limit": alloc.issuers_over_limit,
        "split": asdict(split),
        "stress": stress(alloc, policy),
        "sale_tax": sale_tax(snapshot, policy),
        "fi": fi_compare(cfg, alloc, policy, monthly_saving=args.contribution),
        "tax": asdict(policy.tax),
        "warnings": list(snapshot.warnings),
    })


if __name__ == "__main__":
    sys.exit(main())
