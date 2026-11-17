import json
import unittest
from datetime import date

from finmetrics.report import build_report, parse_invest_split
from tests.test_metrics import expense, income, make_cfg


PLAN = "Вывод месяца\n[пополнения] Резерв=17; Акции=69; Облигации=14"


class InvestSplitTests(unittest.TestCase):
    def test_parse_invest_split_ok(self):
        self.assertEqual(parse_invest_split(PLAN), [("Резерв", 17), ("Акции", 69), ("Облигации", 14)])

    def test_parse_takes_last_marker_line(self):
        text = "[пополнения] Акции=100\nещё текст\n[пополнения] Резерв=40; Акции=60"
        self.assertEqual(parse_invest_split(text), [("Резерв", 40), ("Акции", 60)])

    def test_parse_invest_split_bad(self):
        for bad in (None, "", "просто текст", "[пополнения] Акции=abc", "[пополнения] Акции=60; Облигации=30",
                    "[пополнения] без равно", "[пополнения] Акции=¹00", "[пополнения] Акции=١٠٠", 5, ["x"]):
            self.assertIsNone(parse_invest_split(bad), bad)

    def test_report_invest_split_amounts(self):
        txs = [income(date(2026, 11, 16), 200000)]
        report = build_report(txs, make_cfg(), today=date(2026, 11, 16), invest_plan=PLAN)
        self.assertEqual(report["recent_salary_to_save"], 100000)
        self.assertEqual(report["invest_split"], [{"name": "Резерв", "percent": 17, "amount": 17000},
                                                   {"name": "Акции", "percent": 69, "amount": 69000},
                                                   {"name": "Облигации", "percent": 14, "amount": 14000}])

    def test_report_invest_split_none_without_plan(self):
        report = build_report([], make_cfg(), today=date(2026, 11, 16))
        self.assertIsNone(report["invest_split"])
        report = build_report([], make_cfg(), today=date(2026, 11, 16), invest_plan="мусор")
        self.assertIsNone(report["invest_split"])


class ReportTests(unittest.TestCase):
    def test_report_has_all_sections_and_is_json(self):
        txs = [income(date(2026, 11, 12), 200000), expense(date(2026, 11, 13), 120000)]
        report = build_report(txs, make_cfg(), today=date(2026, 11, 16))
        self.assertEqual(
            set(report),
            {"today", "counter", "carried_gap", "verdict_gap", "suggested_weekly_limit",
             "recent_salary", "recent_salary_to_save", "outlook", "week",
             "invest_split", "fx", "ops", "ops_context", "weekly_totals", "category_history", "rule_active"},
        )
        self.assertEqual(report["counter"]["gap"], 20000)
        self.assertEqual(report["today"], "2026-11-16")
        json.dumps(report, ensure_ascii=False)  # сериализуется без ошибок

    def on_plan_december(self):
        # Зарплата 300k двумя частями, траты 150k равномерно — ровно по плану 50%
        txs = [income(date(2026, 12, 10), 120000), income(date(2026, 12, 25), 180000)]
        txs += [expense(date(2026, 12, d), 150000 / 30) for d in range(1, 31)]
        return txs

    def test_on_plan_mid_month_is_not_behind(self):
        report = build_report(self.on_plan_december(), make_cfg(), today=date(2026, 12, 7))
        self.assertEqual(report["verdict_gap"], 0)

    def test_overspend_this_month_counts_in_verdict_gap(self):
        txs = self.on_plan_december() + [expense(date(2026, 12, 15), 60000)]
        report = build_report(txs, make_cfg(), today=date(2026, 12, 31))
        self.assertAlmostEqual(report["verdict_gap"], 60000, places=0)

    def test_suggested_weekly_limit(self):
        # verdict_gap 60000 → (300000*0.5 - 60000/3) / 4.33
        txs = self.on_plan_december() + [expense(date(2026, 12, 15), 60000)]
        report = build_report(txs, make_cfg(), today=date(2026, 12, 31))
        self.assertAlmostEqual(report["suggested_weekly_limit"], (150000 - 20000) / 4.33, places=0)

    def test_recent_salary_last_three_days(self):
        txs = [income(date(2026, 12, 10), 120000), income(date(2026, 12, 6), 5000)]
        report = build_report(txs, make_cfg(), today=date(2026, 12, 11))
        self.assertEqual(report["recent_salary"], 120000)
        self.assertEqual(report["recent_salary_to_save"], 60000)


if __name__ == "__main__":
    unittest.main()
