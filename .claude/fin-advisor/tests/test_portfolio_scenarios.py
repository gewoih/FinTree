import unittest
from datetime import date

from finportfolio.calc import allocation
from finportfolio.model import Position, Snapshot
from finportfolio.scenarios import fi_compare, sale_tax, stress
from tests.test_metrics import make_cfg
from tests.test_portfolio_calc import policy, snapshot


class ScenarioTests(unittest.TestCase):
    def test_stress_reference(self):
        pol = policy()
        result = stress(allocation(snapshot(), pol), pol)
        self.assertEqual(result["loss"], 350000)
        self.assertAlmostEqual(result["long_term_loss_pct"], 35.0)
        self.assertAlmostEqual(result["total_loss_pct"], 30.97, places=2)

    def test_stress_empty_portfolio_has_no_division(self):
        pol = policy()
        empty = Snapshot(date(2026, 1, 31), (), ())
        self.assertEqual(stress(allocation(empty, pol), pol),
                         {"loss": 0.0, "long_term_loss_pct": 0.0, "total_loss_pct": 0.0})

    def test_sale_tax_with_known_cost(self):
        rows = {r["name"]: r for r in sale_tax(_snapshot_with_costs(), policy())}
        self.assertEqual(rows["поз-a"]["gain"], 50000)
        self.assertAlmostEqual(rows["поз-a"]["tax_default"], 6500)
        self.assertAlmostEqual(rows["поз-a"]["tax_alt"], 15000)

    def test_sale_tax_unknown_cost_is_none(self):
        rows = {r["name"]: r for r in sale_tax(snapshot(), policy())}
        self.assertEqual(rows["поз-a"], {"name": "поз-a", "gain": None, "tax_default": None, "tax_alt": None})

    def test_sale_tax_skips_reserve_and_frozen(self):
        names = {r["name"] for r in sale_tax(snapshot(), policy())}
        self.assertEqual(names, {"поз-a", "поз-b", "поз-c"})

    def test_sale_tax_loss_is_zero_tax(self):
        snap = Snapshot(date(2026, 1, 31), (Position("Счёт", "убыточная", "T", "a", 100.0, 150.0, None),), ())
        row = sale_tax(snap, policy())[0]
        self.assertEqual((row["gain"], row["tax_default"], row["tax_alt"]), (-50.0, 0.0, 0.0))

    def test_fi_compare_returns(self):
        pol = policy()
        result = fi_compare(make_cfg(), allocation(snapshot(), pol), pol, monthly_saving=100000)
        self.assertAlmostEqual(result["current_return"], 0.03)
        self.assertAlmostEqual(result["target_return"], 0.036)
        self.assertLess(result["years_target"], result["years_current"])


def _snapshot_with_costs() -> Snapshot:
    return Snapshot(date(2026, 1, 31), (Position("Счёт", "поз-a", "EQ", "a", 400000.0, 350000.0, None),), ())


if __name__ == "__main__":
    unittest.main()
