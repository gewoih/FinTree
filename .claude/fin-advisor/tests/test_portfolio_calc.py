import dataclasses
import unittest
from datetime import date

from finportfolio.calc import SPLIT_MARKER, allocation, contribution_split
from finportfolio.model import Position, Snapshot, policy_from_dict
from tests.test_portfolio_model import raw_policy


def policy(never_sell_c: bool = True):
    raw = raw_policy()
    raw["classes"][2]["never_sell"] = never_sell_c
    return policy_from_dict(raw)


def snapshot(reserve=80000, a=400000, b=300000, c=300000, frozen=50000, b_issuer="X"):
    rows = [("reserve", reserve, None), ("a", a, None), ("b", b, b_issuer), ("c", c, None), ("frozen", frozen, None)]
    return Snapshot(date(2026, 1, 31),
                    tuple(Position("Счёт", f"поз-{cls}", cls.upper(), cls, float(v), None, issuer)
                          for cls, v, issuer in rows if v), ())


def by_id(alloc):
    return {c.id: c for c in alloc.classes}


class AllocationTests(unittest.TestCase):
    def test_totals(self):
        alloc = allocation(snapshot(), policy())
        self.assertEqual((alloc.total, alloc.reserve, alloc.frozen, alloc.long_term),
                         (1130000, 80000, 50000, 1000000))

    def test_statuses(self):
        states = by_id(allocation(snapshot(), policy()))
        self.assertAlmostEqual(states["a"].share, 0.4)
        self.assertAlmostEqual(states["a"].deviation_pp, -10.0)
        self.assertEqual(states["a"].status, "under")
        self.assertEqual(states["b"].status, "ok")
        self.assertAlmostEqual(states["c"].deviation_pp, 10.0)
        self.assertEqual(states["c"].status, "over")  # never_sell → не sale_candidate

    def test_months_to_target(self):
        states = by_id(allocation(snapshot(), policy(), monthly_invest=100000))
        self.assertAlmostEqual(states["c"].months_to_target, 3.04, places=2)
        self.assertIsNone(states["a"].months_to_target)

    def test_months_to_target_none_without_invest(self):
        self.assertIsNone(by_id(allocation(snapshot(), policy()))["c"].months_to_target)

    def test_sale_candidate_when_dilution_too_slow(self):
        alloc = allocation(snapshot(c=400000), policy(never_sell_c=False), monthly_invest=20000)
        self.assertEqual(by_id(alloc)["c"].status, "sale_candidate")

    def test_over_when_dilution_is_fast_enough(self):
        alloc = allocation(snapshot(c=400000), policy(never_sell_c=False), monthly_invest=100000)
        self.assertEqual(by_id(alloc)["c"].status, "over")

    def test_issuer_over_limit(self):
        alloc = allocation(snapshot(), policy())
        self.assertEqual(len(alloc.issuers_over_limit), 1)
        name, share = alloc.issuers_over_limit[0]
        self.assertEqual(name, "X")
        self.assertAlmostEqual(share, 0.3)

    def test_issuer_under_limit_not_listed(self):
        self.assertEqual(allocation(snapshot(b_issuer=None), policy()).issuers_over_limit, ())

    def test_empty_long_term_no_division(self):
        alloc = allocation(snapshot(a=0, b=0, c=0, frozen=0), policy(), monthly_invest=1000)
        self.assertEqual(alloc.long_term, 0)
        self.assertTrue(all(c.share == 0 and c.status == "ok" for c in alloc.classes))

    def test_class_state_is_frozen_dataclass(self):
        self.assertTrue(dataclasses.is_dataclass(by_id(allocation(snapshot(), policy()))["a"]))


def split(contribution, **kwargs):
    pol = policy()
    return contribution_split(allocation(snapshot(**kwargs), pol), pol, contribution)


class SplitTests(unittest.TestCase):
    def test_split_reference(self):
        result = split(120000)
        self.assertEqual(result.to_reserve, 20000)
        amounts = {i.id: i for i in result.items}
        self.assertEqual(set(amounts), {"reserve", "a", "b"})  # крипта не получает новых денег
        self.assertAlmostEqual(amounts["a"].amount, 83333.33, places=2)
        self.assertAlmostEqual(amounts["b"].amount, 16666.67, places=2)
        self.assertEqual([i.percent for i in result.items], [17, 69, 14])
        self.assertEqual(result.marker, "[пополнения] Резерв=17; Акции=69; Облигации=14")
        self.assertTrue(result.marker.startswith(SPLIT_MARKER))

    def test_contribution_below_reserve_deficit(self):
        result = split(10000)
        self.assertEqual(result.to_reserve, 10000)
        self.assertEqual(result.marker, "[пополнения] Резерв=100")

    def test_zero_and_negative_contribution(self):
        for amount in (0, -5000):
            result = split(amount)
            self.assertEqual(result.items, ())
            self.assertIsNone(result.marker)
            self.assertEqual(result.to_reserve, 0)

    def test_no_shortfall_splits_by_target_among_new_money(self):
        result = split(120000, a=500000, b=300000, c=0)
        amounts = {i.id: i.amount for i in result.items}
        self.assertAlmostEqual(amounts["a"], 62500)
        self.assertAlmostEqual(amounts["b"], 37500)

    def test_reserve_surplus_reported(self):
        result = split(120000, reserve=130000)
        self.assertEqual(result.reserve_surplus, 30000)
        self.assertEqual(result.to_reserve, 0)
        self.assertNotIn("reserve", {i.id for i in result.items})


if __name__ == "__main__":
    unittest.main()
