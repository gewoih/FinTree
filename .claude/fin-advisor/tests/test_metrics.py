import json
import os
import unittest
from datetime import date
from unittest import mock

from finmetrics.config import Config, FiParams, load_config
from finmetrics.metrics import (
    Tx,
    carried_gap,
    cushion,
    expected_monthly_salary,
    fi_shift_days,
    month_outlook,
    parse_transactions,
    payoff_months,
    savings_counter,
    sustained_trends,
    typical_month_spend,
    typical_week_spend,
    week_summary,
)

SALARY = "Зарплата"


def make_cfg(**overrides) -> Config:
    values = dict(
        save_rate=0.5,
        start_date=date(2026, 11, 1),
        tz_offset_hours=5,
        paydays=[10, 25],
        salary_category=SALARY,
        expected_salary=[("2026-11", 300000.0)],
        baseline_months=["2026-02", "2026-03", "2026-04", "2026-05"],
        probation_until=date(2027, 3, 1),
        min_cushion_months=6.0,
        fi=FiParams(target_capital=30_000_000.0, start_capital=1_000_000.0, real_return=0.04, salary_growth=0.03),
    )
    values.update(overrides)
    return Config(**values)


def income(day, amount, category=SALARY):
    return Tx(day=day, kind="Income", amount=amount, category=category, description="")


def expense(day, amount, category="Прочее"):
    return Tx(day=day, kind="Expense", amount=amount, category=category, description="")


class ConfigTests(unittest.TestCase):
    def test_load_config_from_env(self):
        raw = {
            "save_rate": 0.5,
            "start_date": "2026-11-01",
            "tz_offset_hours": 5,
            "paydays": [10, 25],
            "salary_category": SALARY,
            "expected_salary": [{"from": "2026-11", "monthly": 300000}],
            "baseline_months": ["2026-02"],
            "probation_until": "2027-03-01",
            "min_cushion_months": 6,
            "fi": {"target_capital": 1, "start_capital": 2, "real_return": 0.04, "salary_growth": 0.03},
        }
        with mock.patch.dict(os.environ, {"FIN_CONFIG_JSON": json.dumps(raw)}):
            cfg = load_config(None)
        self.assertEqual(cfg.start_date, date(2026, 11, 1))
        self.assertEqual(cfg.expected_salary, [("2026-11", 300000.0)])
        self.assertEqual(cfg.probation_until, date(2027, 3, 1))
        self.assertEqual(cfg.fi.start_capital, 2.0)


class ParseTests(unittest.TestCase):
    def test_parse_uses_almaty_date(self):
        raw = [
            {"occuredAt": "2026-11-30T20:30:00Z", "type": "Expense", "amountInBaseCurrency": 100.0,
             "categoryId": "c1", "isTransfer": False, "description": "x"},
            {"occurredAt": "2026-11-30T10:00:00Z", "type": "Expense", "amountInBaseCurrency": 5.0,
             "categoryId": "c1", "isTransfer": True, "description": None},
        ]
        txs = parse_transactions(raw, {"c1": "Кафе"}, tz_offset_hours=5)
        self.assertEqual(len(txs), 1)
        self.assertEqual(txs[0].day, date(2026, 12, 1))
        self.assertEqual(txs[0].category, "Кафе")

    def test_parse_accepts_five_digit_fraction(self):
        raw = [{"occurredAt": "2026-11-10T10:00:00.12345Z", "type": "Income", "amountInBaseCurrency": 1.0,
                "categoryId": "c", "isTransfer": False}]
        self.assertEqual(parse_transactions(raw, {"c": "x"}, 5)[0].day, date(2026, 11, 10))

    def test_parse_unknown_category_is_dash(self):
        raw = [{"occurredAt": "2026-11-10T10:00:00Z", "type": "Income", "amountInBaseCurrency": 1.0,
                "categoryId": None, "isTransfer": False}]
        self.assertEqual(parse_transactions(raw, {}, 5)[0].category, "-")


class SalaryTests(unittest.TestCase):
    def test_expected_monthly_salary_schedule(self):
        cfg = make_cfg(expected_salary=[("2026-11", 300000.0), ("2027-01", 360000.0)])
        self.assertEqual(expected_monthly_salary(cfg, "2026-10"), 0.0)
        self.assertEqual(expected_monthly_salary(cfg, "2026-12"), 300000.0)
        self.assertEqual(expected_monthly_salary(cfg, "2027-03"), 360000.0)


class CounterTests(unittest.TestCase):
    def base_txs(self):
        return [
            income(date(2026, 11, 12), 200000),
            expense(date(2026, 11, 20), 120000),
            expense(date(2026, 10, 25), 50000),
        ]

    def test_savings_counter_gap(self):
        c = savings_counter(self.base_txs(), make_cfg(), until=date(2026, 11, 30))
        self.assertEqual(c.target, 100000)
        self.assertEqual(c.saved, 80000)
        self.assertEqual(c.gap, 20000)

    def test_other_income_reduces_gap_not_target(self):
        txs = self.base_txs() + [income(date(2026, 11, 15), 30000, "Продажа собственности")]
        c = savings_counter(txs, make_cfg(), until=date(2026, 11, 30))
        self.assertEqual(c.target, 100000)
        self.assertEqual(c.gap, -10000)

    def test_carried_gap_zero_when_start_in_current_month(self):
        self.assertEqual(carried_gap(self.base_txs(), make_cfg(), today=date(2026, 11, 20)), 0.0)

    def test_carried_gap_from_previous_month(self):
        self.assertEqual(carried_gap(self.base_txs(), make_cfg(), today=date(2026, 12, 5)), 20000)


class OutlookTests(unittest.TestCase):
    def test_month_outlook_before_first_payday(self):
        txs = [expense(date(2026, 12, 3), 40000)]
        o = month_outlook(txs, make_cfg(), today=date(2026, 12, 5))
        self.assertEqual(o.salary_received, 0)
        self.assertEqual(o.salary_expected_remaining, 300000)
        self.assertEqual(o.month_target, 150000)
        self.assertEqual(o.can_spend, 110000)

    def test_month_outlook_after_both_payments(self):
        txs = [
            income(date(2026, 12, 10), 120000),
            income(date(2026, 12, 25), 180000),
            expense(date(2026, 12, 20), 100000),
        ]
        o = month_outlook(txs, make_cfg(), today=date(2026, 12, 28))
        self.assertEqual(o.salary_expected_remaining, 0)
        self.assertEqual(o.month_target, 150000)
        self.assertEqual(o.can_spend, 50000)


class PayoffTests(unittest.TestCase):
    def test_payoff_months(self):
        cfg = make_cfg()
        self.assertEqual(payoff_months(64000, cfg, "2026-12", typical_month=118000), 2.0)
        self.assertIsNone(payoff_months(64000, cfg, "2026-12", typical_month=150000))
        self.assertEqual(payoff_months(-1, cfg, "2026-12", typical_month=118000), 0.0)


class BaselineTests(unittest.TestCase):
    def test_typical_month_spend_median(self):
        cfg = make_cfg(baseline_months=["2026-02", "2026-03", "2026-04"])
        txs = [expense(date(2026, 2, 10), 100000), expense(date(2026, 3, 10), 150000),
               expense(date(2026, 4, 10), 120000), expense(date(2026, 6, 10), 999999)]
        self.assertEqual(typical_month_spend(txs, cfg), 120000)

    def test_typical_week_spend_uses_full_weeks_inside_baseline(self):
        cfg = make_cfg(baseline_months=["2026-02"])
        # Полные недели Пн–Вс внутри февраля 2026: 2–8, 9–15, 16–22 (23 фев–1 мар выходит за месяц)
        txs = [expense(date(2026, 2, 3), 7000), expense(date(2026, 2, 10), 3000),
               expense(date(2026, 2, 17), 5000), expense(date(2026, 2, 24), 90000)]
        self.assertEqual(typical_week_spend(txs, cfg), 5000)

    def test_week_summary_last_full_week(self):
        cfg = make_cfg(baseline_months=["2026-02"])
        txs = [expense(date(2026, 11, 8), 777, "Кафе"), expense(date(2026, 11, 9), 1000, "Кафе"),
               expense(date(2026, 11, 15), 5000, "Дом"), expense(date(2026, 11, 16), 999, "Кафе"),
               expense(date(2026, 2, 3), 4000), expense(date(2026, 2, 10), 4000),
               expense(date(2026, 2, 17), 4000)]
        w = week_summary(txs, cfg, today=date(2026, 11, 19))
        self.assertEqual((w.start, w.end), (date(2026, 11, 9), date(2026, 11, 15)))
        self.assertEqual(w.spent, 6000)
        self.assertEqual(w.top, [("Дом", 5000), ("Кафе", 1000)])
        self.assertEqual(w.typical, 4000)

    def test_typical_week_counts_weeks_without_expenses(self):
        cfg = make_cfg(baseline_months=["2026-02"])
        txs = [expense(date(2026, 2, 3), 9000)]
        self.assertEqual(typical_week_spend(txs, cfg), 0)


class TrendTests(unittest.TestCase):
    def cafe_baseline(self):
        return [expense(date(2026, m, 10), 10000, "Кафе") for m in (2, 3, 4, 5)]

    def test_sustained_trend_needs_three_months(self):
        cfg = make_cfg(start_date=date(2026, 9, 1))
        not_trend = self.cafe_baseline() + [
            expense(date(2026, 9, 10), 20000, "Кафе"),
            expense(date(2026, 10, 10), 9000, "Кафе"),
            expense(date(2026, 11, 10), 20000, "Кафе"),
        ]
        self.assertEqual(sustained_trends(not_trend, cfg, today=date(2026, 12, 5)), [])

        trend = self.cafe_baseline() + [expense(date(2026, m, 10), 20000, "Кафе") for m in (9, 10, 11)]
        result = sustained_trends(trend, cfg, today=date(2026, 12, 5))
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].category, "Кафе")
        self.assertEqual(result[0].recent_avg, 20000)
        self.assertEqual(result[0].baseline_avg, 10000)

    def test_no_trends_from_months_before_start(self):
        # Старт правила 2026-11-01: август–октябрь (до старта) не должны давать «трендов»
        cfg = make_cfg()
        txs = self.cafe_baseline() + [expense(date(2026, m, 10), 20000, "Кафе") for m in (8, 9, 10)]
        self.assertEqual(sustained_trends(txs, cfg, today=date(2026, 11, 16)), [])

    def test_small_excess_is_not_trend(self):
        cfg = make_cfg(start_date=date(2026, 9, 1))
        txs = [expense(date(2026, m, 10), 1000, "Кафе") for m in (2, 3, 4, 5)] + \
              [expense(date(2026, m, 10), 2000, "Кафе") for m in (9, 10, 11)]
        self.assertEqual(sustained_trends(txs, cfg, today=date(2026, 12, 5)), [])


class FiTests(unittest.TestCase):
    def test_fi_shift_days_sign(self):
        cfg = make_cfg()
        self.assertGreater(fi_shift_days(cfg, 100000, "2026-11"), 0)
        self.assertLess(fi_shift_days(cfg, -100000, "2026-11"), 0)
        self.assertEqual(fi_shift_days(cfg, 0, "2026-11"), 0)


class CushionTests(unittest.TestCase):
    def test_cushion_unknown_when_liquid_assets_missing(self):
        c = cushion(None, 150000, make_cfg(), today=date(2026, 11, 16))
        self.assertIsNone(c.months)
        self.assertFalse(c.below_min)

    def test_cushion_below_min_during_probation(self):
        c = cushion(500000, 150000, make_cfg(), today=date(2026, 11, 16))
        self.assertAlmostEqual(c.months, 3.33, places=2)
        self.assertTrue(c.below_min)
        self.assertTrue(c.probation_active)

    def test_cushion_not_flagged_after_probation(self):
        c = cushion(500000, 150000, make_cfg(), today=date(2027, 4, 1))
        self.assertFalse(c.below_min)
        self.assertFalse(c.probation_active)


if __name__ == "__main__":
    unittest.main()
