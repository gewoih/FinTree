import json
import unittest
from datetime import date

from finmetrics.metrics import Tx, category_history, week_operations
from finmetrics.report import build_report
from tests.test_metrics import expense, income, make_cfg

TODAY = date(2026, 11, 16)  # понедельник; прошлая неделя 09–15 ноября


def tx(day, amount, category="Кафе", description="", kind="Expense", currency="", original=0.0):
    return Tx(day=day, kind=kind, amount=amount, category=category, description=description,
              currency=currency, original=original)


class WeekOperationsTests(unittest.TestCase):
    def test_only_last_full_week_sorted_by_day(self):
        txs = [tx(date(2026, 11, 12), 500), tx(date(2026, 11, 9), 300), tx(date(2026, 11, 8), 100),
               tx(date(2026, 11, 16), 200), tx(date(2026, 11, 15), 700)]
        ops = week_operations(txs, TODAY)
        self.assertEqual([o.day for o in ops], [date(2026, 11, 9), date(2026, 11, 12), date(2026, 11, 15)])

    def test_includes_income_and_description(self):
        ops = week_operations([tx(date(2026, 11, 12), 100000, "Зарплата", "аванс", kind="Income")], TODAY)
        self.assertEqual((ops[0].kind, ops[0].category, ops[0].description), ("Income", "Зарплата", "аванс"))

    def test_foreign_currency_only_when_converted(self):
        ops = week_operations([tx(date(2026, 11, 10), 4293, "Дом", "горелка", currency="KZT", original=23137.0),
                               tx(date(2026, 11, 11), 500, "Кафе", currency="RUB", original=500.0),
                               tx(date(2026, 11, 12), 700, "Кафе")], TODAY)
        self.assertEqual((ops[0].currency, ops[0].original), ("KZT", 23137.0))
        self.assertEqual((ops[1].currency, ops[1].original), (None, None))
        self.assertEqual((ops[2].currency, ops[2].original), (None, None))

    def test_empty_week(self):
        self.assertEqual(week_operations([], TODAY), [])


class CategoryHistoryTests(unittest.TestCase):
    def test_counts_and_sums_per_week(self):
        txs = [tx(date(2026, 11, 10), 500), tx(date(2026, 11, 12), 300),  # неделя с 09.11
               tx(date(2026, 11, 3), 200),  # неделя с 02.11
               tx(date(2026, 9, 14), 900)]  # неделя с 14.09 — самая старая из 8
        history = category_history(txs, TODAY, weeks=8)
        self.assertEqual(history["weeks"][0], "2026-09-21")  # 8 недель до 09.11 включительно: 21.09 … 09.11
        self.assertEqual(history["weeks"][-1], "2026-11-09")
        cafe = history["categories"]["Кафе"]
        self.assertEqual(cafe["count"][-1], 2)
        self.assertEqual(cafe["spent"][-1], 800)
        self.assertEqual(cafe["count"][-2], 1)
        self.assertEqual(sum(cafe["count"]), 3)  # 14.09 вне окна

    def test_expenses_only_and_category_cap(self):
        txs = [tx(date(2026, 11, 10), 100, "Зарплата", kind="Income")]
        txs += [tx(date(2026, 11, 10), 10 + i, f"Кат{i}") for i in range(15)]
        history = category_history(txs, TODAY, weeks=8)
        self.assertNotIn("Зарплата", history["categories"])
        self.assertEqual(len(history["categories"]), 12)
        self.assertIn("Кат14", history["categories"])  # крупнейшие по сумме остаются

    def test_empty(self):
        history = category_history([], TODAY, weeks=8)
        self.assertEqual(history["categories"], {})
        self.assertEqual(len(history["weeks"]), 8)


class RuleActiveTests(unittest.TestCase):
    def test_rule_active_flag_follows_start_date(self):
        cfg = make_cfg()  # старт правила 2026-11-01
        self.assertTrue(build_report([], cfg, date(2026, 11, 16), None)["rule_active"])
        self.assertTrue(build_report([], cfg, date(2026, 11, 1), None)["rule_active"])
        self.assertFalse(build_report([], cfg, date(2026, 10, 26), None)["rule_active"])


class ReportOpsTests(unittest.TestCase):
    def test_report_has_ops_and_history_and_is_json(self):
        txs = [income(date(2026, 11, 12), 200000), expense(date(2026, 11, 13), 1200, "Кафе")]
        report = build_report(txs, make_cfg(), TODAY)
        self.assertEqual({o["category"] for o in report["ops"]}, {"Зарплата", "Кафе"})
        self.assertEqual(report["ops"][0]["day"], "2026-11-12")
        self.assertIn("Кафе", report["category_history"]["categories"])
        json.dumps(report, ensure_ascii=False)


if __name__ == "__main__":
    unittest.main()
