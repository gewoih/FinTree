"""Типы и проверка политики и снимка портфеля.

Политика (`policy.json`) и снимок (`positions/YYYY-MM.json`) лежат в `.claude/finance/` и в репозиторий не попадают.
Все суммы в снимке пересчитываются в рубли по курсам из поля `fx`.
"""

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

RESERVE = "reserve"
FROZEN = "frozen"
BASE_CURRENCY = "RUB"
TARGETS_TOLERANCE = 0.001
TOTAL_TOLERANCE_ABS = 10.0
TOTAL_TOLERANCE_REL = 0.001


class PortfolioError(ValueError):
    """Политика или снимок не прошли проверку."""


@dataclass(frozen=True)
class AssetClass:
    id: str
    name: str
    target: float
    tolerance_pp: float
    new_money: bool
    never_sell: bool
    stress_drop: float
    expected_real_return: float


@dataclass(frozen=True)
class Tax:
    default_rate: float
    alt_rate: float
    status: str
    source: str
    checked: str


@dataclass(frozen=True)
class Policy:
    reserve_target: float
    sale_threshold_pp: float
    sale_fix_months: int
    issuer_limit: float
    classes: tuple[AssetClass, ...]
    tax: Tax


@dataclass(frozen=True)
class Position:
    account: str
    name: str
    ticker: str
    cls: str
    value_rub: float
    cost_rub: float | None
    issuer: str | None
    value_native: float = 0.0  # стоимость в валюте счёта — для сверки со скриншотом
    currency: str = BASE_CURRENCY


@dataclass(frozen=True)
class Account:
    name: str
    currency: str
    rate: float
    stated_total: float | None  # итог на скриншоте; None — не виден
    total: float  # сумма позиций в валюте счёта


@dataclass(frozen=True)
class Snapshot:
    day: date
    positions: tuple[Position, ...]
    warnings: tuple[str, ...]
    accounts: tuple[Account, ...] = ()


def policy_from_dict(raw: dict) -> Policy:
    try:
        classes = tuple(
            AssetClass(
                id=str(c["id"]), name=str(c["name"]), target=float(c["target"]),
                tolerance_pp=float(c["tolerance_pp"]), new_money=bool(c["new_money"]),
                never_sell=bool(c["never_sell"]), stress_drop=float(c["stress_drop"]),
                expected_real_return=float(c["expected_real_return"]),
            )
            for c in raw["classes"]
        )
        tax_raw = raw["tax"]
        tax = Tax(float(tax_raw["default_rate"]), float(tax_raw["alt_rate"]), str(tax_raw.get("status", "")),
                  str(tax_raw.get("source", "")), str(tax_raw.get("checked", "")))
        policy = Policy(float(raw["reserve_target"]), float(raw["sale_threshold_pp"]), int(raw["sale_fix_months"]),
                        float(raw["issuer_limit"]), classes, tax)
    except (KeyError, TypeError, ValueError) as e:
        raise PortfolioError(f"Политика: не хватает или неверно поле {e}") from None

    ids = [c.id for c in classes]
    if len(set(ids)) != len(ids):
        raise PortfolioError("Политика: id классов должны быть уникальны")
    if RESERVE in ids or FROZEN in ids:
        raise PortfolioError(f"Политика: id «{RESERVE}» и «{FROZEN}» зарезервированы")
    if not any(c.new_money for c in classes):
        raise PortfolioError("Политика: нужен хотя бы один класс с new_money: true — иначе новым деньгам некуда идти")
    if abs(sum(c.target for c in classes) - 1) > TARGETS_TOLERANCE:
        raise PortfolioError("Политика: целевые доли классов должны давать в сумме 1")
    return policy


def load_policy(path: str | Path) -> Policy:
    try:
        return policy_from_dict(json.loads(Path(path).read_text(encoding="utf-8")))
    except FileNotFoundError:
        raise PortfolioError(f"Нет файла политики: {path}") from None
    except json.JSONDecodeError as e:
        raise PortfolioError(f"Политика: некорректный JSON ({e})") from None


def snapshot_from_dict(raw: dict, policy: Policy) -> Snapshot:
    known = {c.id for c in policy.classes} | {RESERVE, FROZEN}
    fx = raw.get("fx") or {}
    positions: list[Position] = []
    accounts_out: list[Account] = []
    warnings: list[str] = []
    try:
        day = date.fromisoformat(raw["date"])
        accounts = raw["accounts"]
    except (KeyError, TypeError, ValueError):
        raise PortfolioError("Снимок: нужны поля date (YYYY-MM-DD) и accounts") from None

    for account in accounts:
        name = account.get("name", "?")
        currency = account.get("currency", BASE_CURRENCY)
        rate = 1.0 if currency == BASE_CURRENCY else fx.get(currency)
        if rate is None:
            raise PortfolioError(f"Счёт «{name}»: нет курса {currency} в поле fx")
        items = account.get("positions") or []
        if not items:
            raise PortfolioError(f"Счёт «{name}»: нет позиций")

        native_sum = 0.0
        for p in items:
            pname = p.get("name", "?")
            if p.get("class") not in known:
                raise PortfolioError(f"Позиция «{pname}» (счёт «{name}»): неизвестный класс «{p.get('class')}»")
            value = p.get("value")
            if not isinstance(value, (int, float)) or value < 0:
                raise PortfolioError(f"Позиция «{pname}» (счёт «{name}»): стоимость должна быть числом не меньше 0")
            cost = p.get("cost")
            native_sum += value
            positions.append(Position(
                account=name, name=pname, ticker=p.get("ticker", ""), cls=p["class"],
                value_rub=value * rate, cost_rub=None if cost is None else cost * rate,
                issuer=p.get("issuer"), value_native=value, currency=currency,
            ))

        stated = account.get("stated_total")
        accounts_out.append(Account(name, currency, rate, stated, native_sum))
        if stated is None:
            warnings.append(f"{name}: итог не сверён")
        elif abs(native_sum - stated) > max(TOTAL_TOLERANCE_ABS, TOTAL_TOLERANCE_REL * stated):
            raise PortfolioError(
                f"Счёт «{name}»: сумма позиций {native_sum:g} не сходится с итогом на скриншоте {stated:g} {currency}")

    return Snapshot(day, tuple(positions), tuple(warnings), tuple(accounts_out))


def load_snapshot(path: str | Path, policy: Policy) -> Snapshot:
    try:
        return snapshot_from_dict(json.loads(Path(path).read_text(encoding="utf-8")), policy)
    except FileNotFoundError:
        raise PortfolioError(f"Нет файла снимка: {path}") from None
    except json.JSONDecodeError as e:
        raise PortfolioError(f"Снимок: некорректный JSON ({e})") from None
