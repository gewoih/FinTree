"""Сценарии: просадка, налог при продаже, срок до независимости. Допущения берутся из политики."""

from dataclasses import replace

from finmetrics.config import Config
from finmetrics.metrics import months_to_fi

from .calc import Allocation
from .model import FROZEN, RESERVE, Policy, Snapshot

MONTHS_PER_YEAR = 12


def stress(alloc: Allocation, policy: Policy) -> dict:
    """Потери в плохой год: у каждого класса своя просадка из политики; резерв и замороженное не падают."""
    drops = {c.id: c.stress_drop for c in policy.classes}
    loss = sum(s.value * drops[s.id] for s in alloc.classes)
    return {
        "loss": loss,
        "long_term_loss_pct": loss / alloc.long_term * 100 if alloc.long_term > 0 else 0.0,
        "total_loss_pct": loss / alloc.total * 100 if alloc.total > 0 else 0.0,
    }


def sale_tax(snapshot: Snapshot, policy: Policy) -> list[dict]:
    """Налог при продаже каждой позиции по ставке по умолчанию и по альтернативной (убыток — налог 0)."""
    rows = []
    for p in snapshot.positions:
        if p.cls in (RESERVE, FROZEN):
            continue
        if p.cost_rub is None:
            rows.append({"name": p.name, "gain": None, "tax_default": None, "tax_alt": None})
            continue
        gain = p.value_rub - p.cost_rub
        rows.append({"name": p.name, "gain": gain,
                     "tax_default": max(0.0, gain) * policy.tax.default_rate,
                     "tax_alt": max(0.0, gain) * policy.tax.alt_rate})
    return rows


def fi_compare(cfg: Config, alloc: Allocation, policy: Policy, monthly_saving: float) -> dict | None:
    """Срок до независимости при доходности по текущим и по целевым долям (по допущениям из политики).
    None, если в конфиге нет параметров модели независимости."""
    if cfg.fi is None:
        return None
    returns = {c.id: c.expected_real_return for c in policy.classes}
    current = sum(s.share * returns[s.id] for s in alloc.classes)
    target = sum(s.target * returns[s.id] for s in alloc.classes)

    def years(rate: float) -> float:
        tuned = replace(cfg, fi=replace(cfg.fi, real_return=rate))
        return months_to_fi(tuned, alloc.total, monthly_saving) / MONTHS_PER_YEAR

    return {"current_return": current, "target_return": target,
            "years_current": years(current), "years_target": years(target)}
