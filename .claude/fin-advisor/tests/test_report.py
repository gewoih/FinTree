import json
import unittest
from datetime import date

from finmetrics.report import build_report
from tests.test_metrics import expense, income, make_cfg


class ReportTests(unittest.TestCase):
    def test_report_has_all_sections_and_is_json(self):
        txs = [income(date(2026, 11, 12), 200000), expense(date(2026, 11, 13), 120000)]
        report = build_report(txs, make_cfg(), today=date(2026, 11, 16), liquid_assets=None)
        self.assertEqual(
            set(report),
            {"today", "counter", "carried_gap", "verdict_gap", "payoff_months", "suggested_weekly_limit",
             "recent_salary", "recent_salary_to_save", "outlook", "week", "trends",
             "fi_shift_days", "cushion", "typical_month", "warnings"},
        )
        self.assertEqual(report["counter"]["gap"], 20000)
        self.assertEqual(report["today"], "2026-11-16")
        self.assertTrue(report["warnings"])
        json.dumps(report, ensure_ascii=False)  # сериализуется без ошибок

    def test_report_warns_when_liquid_assets_missing(self):
        report = build_report([], make_cfg(), today=date(2026, 11, 16), liquid_assets=None)
        self.assertTrue(any("подушк" in w for w in report["warnings"]))
        self.assertIsNone(report["cushion"]["months"])

    def on_plan_december(self):
        # Зарплата 300k двумя частями, траты 150k равномерно — ровно по плану 50%
        txs = [income(date(2026, 12, 10), 120000), income(date(2026, 12, 25), 180000)]
        txs += [expense(date(2026, 12, d), 150000 / 30) for d in range(1, 31)]
        return txs

    def test_on_plan_mid_month_is_not_behind(self):
        report = build_report(self.on_plan_december(), make_cfg(), today=date(2026, 12, 7), liquid_assets=1.0)
        self.assertEqual(report["verdict_gap"], 0)
        self.assertEqual(report["payoff_months"], 0.0)
        self.assertEqual(report["fi_shift_days"], 0)

    def test_overspend_this_month_counts_in_verdict_gap(self):
        txs = self.on_plan_december() + [expense(date(2026, 12, 15), 60000)]
        report = build_report(txs, make_cfg(), today=date(2026, 12, 31), liquid_assets=1.0)
        self.assertAlmostEqual(report["verdict_gap"], 60000, places=0)
        self.assertGreater(report["fi_shift_days"], 0)

    def test_suggested_weekly_limit(self):
        # verdict_gap 60000 → (300000*0.5 - 60000/3) / 4.33
        txs = self.on_plan_december() + [expense(date(2026, 12, 15), 60000)]
        report = build_report(txs, make_cfg(), today=date(2026, 12, 31), liquid_assets=1.0)
        self.assertAlmostEqual(report["suggested_weekly_limit"], (150000 - 20000) / 4.33, places=0)

    def test_recent_salary_last_three_days(self):
        txs = [income(date(2026, 12, 10), 120000), income(date(2026, 12, 6), 5000)]
        report = build_report(txs, make_cfg(), today=date(2026, 12, 11), liquid_assets=1.0)
        self.assertEqual(report["recent_salary"], 120000)
        self.assertEqual(report["recent_salary_to_save"], 60000)


if __name__ == "__main__":
    unittest.main()
