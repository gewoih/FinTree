"""Доли, отклонения от политики и план пополнения. Все числа считает код, ИИ их только объясняет."""

from dataclasses import dataclass

from .model import FROZEN, RESERVE, Policy, Snapshot

SPLIT_MARKER = "[пополнения]"
RESERVE_NAME = "Резерв"


@dataclass(frozen=True)
class ClassState:
    id: str
    name: str
    value: float
    share: float
    target: float
    deviation_pp: float
    status: str  # ok | under | over | sale_candidate
    months_to_target: float | None


@dataclass(frozen=True)
class Allocation:
    total: float
    reserve: float
    frozen: float
    long_term: float
    classes: tuple[ClassState, ...]
    issuers_over_limit: tuple[tuple[str, float], ...]


def allocation(snapshot: Snapshot, policy: Policy, monthly_invest: float = 0.0) -> Allocation:
    values: dict[str, float] = {}
    for p in snapshot.positions:
        values[p.cls] = values.get(p.cls, 0.0) + p.value_rub
    reserve = values.get(RESERVE, 0.0)
    frozen = values.get(FROZEN, 0.0)
    long_term = sum(values.get(c.id, 0.0) for c in policy.classes)

    states = tuple(_class_state(c, values.get(c.id, 0.0), long_term, monthly_invest, policy)
                   for c in policy.classes)

    issuers: dict[str, float] = {}
    class_ids = {c.id for c in policy.classes}
    for p in snapshot.positions:
        if p.issuer and p.cls in class_ids:
            issuers[p.issuer] = issuers.get(p.issuer, 0.0) + p.value_rub
    over = tuple((name, value / long_term) for name, value in issuers.items()
                 if long_term > 0 and value / long_term > policy.issuer_limit)

    return Allocation(reserve + frozen + long_term, reserve, frozen, long_term, states, over)


def _class_state(cls, value: float, long_term: float, monthly_invest: float, policy: Policy) -> ClassState:
    if long_term <= 0:
        return ClassState(cls.id, cls.name, value, 0.0, cls.target, 0.0, "ok", None)
    share = value / long_term
    deviation_pp = (share - cls.target) * 100
    if abs(deviation_pp) <= cls.tolerance_pp:
        return ClassState(cls.id, cls.name, value, share, cls.target, deviation_pp, "ok", None)
    if deviation_pp < 0:
        return ClassState(cls.id, cls.name, value, share, cls.target, deviation_pp, "under", None)

    months = None
    if monthly_invest > 0:
        months = (value / (cls.target + cls.tolerance_pp / 100) - long_term) / monthly_invest
    too_slow = months is None or months > policy.sale_fix_months
    sale = deviation_pp > policy.sale_threshold_pp and not cls.never_sell and too_slow
    return ClassState(cls.id, cls.name, value, share, cls.target, deviation_pp,
                      "sale_candidate" if sale else "over", months)


@dataclass(frozen=True)
class SplitItem:
    id: str
    name: str
    amount: float
    percent: int


@dataclass(frozen=True)
class Split:
    contribution: float
    to_reserve: float
    reserve_surplus: float
    items: tuple[SplitItem, ...]
    marker: str | None


def contribution_split(alloc: Allocation, policy: Policy, contribution: float) -> Split:
    """Куда направить сумму к откладыванию: сначала резерв до нормы, остальное — в недовесные классы."""
    surplus = max(0.0, alloc.reserve - policy.reserve_target)
    if contribution <= 0:
        return Split(contribution, 0.0, surplus, (), None)

    to_reserve = min(contribution, max(0.0, policy.reserve_target - alloc.reserve))
    rest = contribution - to_reserve
    amounts: list[tuple[str, str, float]] = []
    if to_reserve > 0:
        amounts.append((RESERVE, RESERVE_NAME, to_reserve))

    eligible = [c for c in policy.classes if c.new_money]
    if rest > 0 and eligible:
        values = {s.id: s.value for s in alloc.classes}
        shortfall = {c.id: max(0.0, c.target * (alloc.long_term + rest) - values[c.id]) for c in eligible}
        weights = shortfall if sum(shortfall.values()) > 0 else {c.id: c.target for c in eligible}
        total_weight = sum(weights.values())
        for c in eligible:
            if weights[c.id] > 0:
                amounts.append((c.id, c.name, rest * weights[c.id] / total_weight))

    percents = _percents([a for _, _, a in amounts])
    items = tuple(SplitItem(i, n, a, p) for (i, n, a), p in zip(amounts, percents))
    marker = f"{SPLIT_MARKER} " + "; ".join(f"{i.name}={i.percent}" for i in items) if items else None
    return Split(contribution, to_reserve, surplus, items, marker)


def _percents(amounts: list[float]) -> list[int]:
    """Целые проценты с суммой ровно 100 (метод наибольших остатков)."""
    total = sum(amounts)
    if total <= 0:
        return [0] * len(amounts)
    raw = [a / total * 100 for a in amounts]
    result = [int(r) for r in raw]
    order = sorted(range(len(raw)), key=lambda i: raw[i] - result[i], reverse=True)
    for i in order[:100 - sum(result)]:
        result[i] += 1
    return result
