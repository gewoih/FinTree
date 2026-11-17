import json
import unittest
from datetime import date

from finmetrics.metrics import Tx, ops_context, weekly_totals
from finmetrics.report import build_report
from tests.test_metrics import make_cfg

TODAY = date(2026, 11, 16)  # понедельник; прошлая неделя 09–15 ноября, окно контекста 10.08–08.11


def tx(day, amount, category="Кафе", description="", kind="Expense"):
    return Tx(day=day, kind=kind, amount=amount, category=category, description=description)


class OpsContextTests(unittest.TestCase):
    def test_line_format(self):
        lines = ops_context([tx(date(2026, 11, 2), 1200.4, "Кафе", "кофе"),
                             tx(date(2026, 11, 1), 171628.0, "Зарплата", "", kind="Income"),
                             tx(date(2026, 11, 3), 500, "Транспорт", "")], TODAY)
        self.assertEqual(lines, ["2026-11-01 +171628 Зарплата",
                                 "2026-11-02 -1200 Кафе: кофе",
                                 "2026-11-03 -500 Транспорт"])

    def test_window_is_13_weeks_before_the_last_full_week(self):
        txs = [tx(date(2026, 8, 9), 1), tx(date(2026, 8, 10), 2), tx(date(2026, 11, 8), 3),
               tx(date(2026, 11, 9), 4), tx(date(2026, 11, 15), 5), tx(date(2026, 11, 16), 6)]
        lines = ops_context(txs, TODAY)
        self.assertEqual([ln.split()[0] for ln in lines], ["2026-08-10", "2026-11-08"])  # неделя 09–15 в `ops`, не здесь

    def test_sorted_by_day_and_empty(self):
        lines = ops_context([tx(date(2026, 10, 5), 1), tx(date(2026, 9, 5), 2)], TODAY)
        self.assertEqual([ln.split()[0] for ln in lines], ["2026-09-05", "2026-10-05"])
        self.assertEqual(ops_context([], TODAY), [])

    def test_report_has_ops_context_and_is_json(self):
        report = build_report([tx(date(2026, 10, 5), 700, "Кафе", "обед")], make_cfg(), TODAY)
        self.assertEqual(report["ops_context"], ["2026-10-05 -700 Кафе: обед"])
        json.dumps(report, ensure_ascii=False)


class WeeklyTotalsTests(unittest.TestCase):
    def test_totals_per_week_before_the_last_full_week(self):
        txs = [tx(date(2026, 11, 3), 1000), tx(date(2026, 11, 8), 500),  # неделя с 02.11
               tx(date(2026, 10, 27), 300),  # неделя с 26.10
               tx(date(2026, 11, 3), 99999, "Зарплата", kind="Income"),  # доходы не считаются
               tx(date(2026, 11, 10), 7000)]  # прошлая полная неделя 09–15.11 — в `week`, не здесь
        rows = weekly_totals(txs, TODAY)
        self.assertEqual(len(rows), 13)
        self.assertEqual(rows[0]["week_start"], "2026-08-10")  # 13 недель до недели с 09.11: 10.08 … 02.11
        self.assertEqual(rows[-1], {"week_start": "2026-11-02", "spent": 1500})
        self.assertEqual(rows[-2], {"week_start": "2026-10-26", "spent": 300})
        self.assertEqual(rows[0]["spent"], 0)

    def test_report_has_weekly_totals(self):
        report = build_report([tx(date(2026, 11, 3), 700)], make_cfg(), TODAY)
        self.assertEqual(report["weekly_totals"][-1], {"week_start": "2026-11-02", "spent": 700})


if __name__ == "__main__":
    unittest.main()
