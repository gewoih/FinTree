import json
import os
import unittest
from datetime import date
from unittest import mock

from finmetrics.config import Config, FiParams, load_config
from finmetrics.metrics import (
    Tx,
    carried_gap,
    expected_monthly_salary,
    month_outlook,
    parse_transactions,
    savings_counter,
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
            "fi": {"target_capital": 1, "start_capital": 2, "real_return": 0.04, "salary_growth": 0.03},
        }
        with mock.patch.dict(os.environ, {"FIN_CONFIG_JSON": json.dumps(raw)}):
            cfg = load_config(None)
        self.assertEqual(cfg.start_date, date(2026, 11, 1))
        self.assertEqual(cfg.expected_salary, [("2026-11", 300000.0)])
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


class WeekSummaryTests(unittest.TestCase):
    def test_week_summary_last_full_week(self):
        txs = [expense(date(2026, 11, 8), 777, "Кафе"), expense(date(2026, 11, 9), 1000, "Кафе"),
               expense(date(2026, 11, 15), 5000, "Дом"), expense(date(2026, 11, 16), 999, "Кафе")]
        w = week_summary(txs, make_cfg(), today=date(2026, 11, 19))
        self.assertEqual((w.start, w.end), (date(2026, 11, 9), date(2026, 11, 15)))
        self.assertEqual(w.spent, 6000)
        self.assertEqual(w.top, [("Дом", 5000), ("Кафе", 1000)])
