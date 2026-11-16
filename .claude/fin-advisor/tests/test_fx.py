import unittest
from datetime import date

from finmetrics.config import _from_dict
from finmetrics.metrics import Tx, fx_effect, parse_transactions
from finmetrics.report import build_report
from tests.test_metrics import make_cfg

TODAY = date(2026, 11, 16)  # понедельник; прошлая неделя 09–15 ноября


def kzt(day, original, rate, exact=True, kind="Expense"):
    return Tx(day=day, kind=kind, amount=original * rate, category="Прочее", description="",
              currency="KZT", original=float(original), exact_rate=exact)


def window_txs(rate_prev, rate_now):
    prev = [kzt(date(2026, 10, d), 10000, rate_prev) for d in (1, 5, 10)]  # окно 21.09–18.10
    now = [kzt(date(2026, 10, d), 10000, rate_now) for d in (22, 25, 30)]  # окно 19.10–15.11
    week = [kzt(date(2026, 11, 10), 100000, rate_now)]  # трата недели в тенге
    return prev + now + week


class ParseFxTests(unittest.TestCase):
    def raw(self, approximate):
        return [{"occuredAt": "2026-11-10T10:00:00Z", "type": "Expense", "amountInBaseCurrency": 180.0,
                 "categoryId": None, "isTransfer": False, "originalAmount": 1000.0,
                 "originalCurrencyCode": "KZT", "isApproximateConversion": approximate}]

    def test_exact_rate_flag(self):
        tx = parse_transactions(self.raw(False), {}, 5)[0]
        self.assertEqual((tx.currency, tx.original, tx.exact_rate), ("KZT", 1000.0, True))

    def test_approximate_rate_is_not_exact(self):
        self.assertFalse(parse_transactions(self.raw(True), {}, 5)[0].exact_rate)

    def test_missing_fields_default(self):
        raw = [{"occuredAt": "2026-11-10T10:00:00Z", "type": "Income", "amountInBaseCurrency": 1.0,
                "categoryId": None, "isTransfer": False}]
        tx = parse_transactions(raw, {}, 5)[0]
        self.assertEqual((tx.currency, tx.original, tx.exact_rate), ("", 0.0, False))


class ConfigFxTests(unittest.TestCase):
    RAW = {"save_rate": 0.5, "start_date": "2026-11-01", "salary_category": "Зарплата",
           "fi": {"target_capital": 1, "start_capital": 1, "real_return": 0.04, "salary_growth": 0.03}}

    def test_fx_currency_is_loaded(self):
        self.assertEqual(_from_dict({**self.RAW, "fx_currency": "KZT"}).fx_currency, "KZT")

    def test_fx_currency_is_off_by_default(self):
        self.assertIsNone(_from_dict(self.RAW).fx_currency)
        self.assertIsNone(_from_dict({**self.RAW, "fx_currency": ""}).fx_currency)


class FxEffectTests(unittest.TestCase):
    cfg = make_cfg(fx_currency="KZT")

    def test_effect_of_rate_change_on_week_spend(self):
        result = fx_effect(window_txs(0.16, 0.18), self.cfg, TODAY)
        self.assertAlmostEqual(result.rate_prev, 0.16)
        self.assertAlmostEqual(result.rate_now, 0.18)
        self.assertAlmostEqual(result.change_pct, 12.5)
        self.assertEqual(result.spent_foreign, 100000)
        self.assertAlmostEqual(result.effect_rub, 2000)  # 100 000 ₸ × (0.18 − 0.16)

    def test_negative_effect_when_currency_gets_cheaper(self):
        result = fx_effect(window_txs(0.18, 0.16), self.cfg, TODAY)
        self.assertAlmostEqual(result.effect_rub, -2000)

    def test_off_without_currency_in_config(self):
        self.assertIsNone(fx_effect(window_txs(0.16, 0.18), make_cfg(), TODAY))

    def test_small_change_is_hidden(self):
        self.assertIsNone(fx_effect(window_txs(0.1800, 0.1810), self.cfg, TODAY))

    def test_small_rouble_effect_is_hidden(self):
        txs = window_txs(0.16, 0.18)[:-1] + [kzt(date(2026, 11, 10), 1000, 0.18)]  # 1 000 ₸ → 20 ₽
        self.assertIsNone(fx_effect(txs, self.cfg, TODAY))

    def test_approximate_rates_are_ignored(self):
        prev = [kzt(date(2026, 10, d), 10000, 0.16, exact=False) for d in (1, 5, 10)]
        now = [kzt(date(2026, 10, d), 10000, 0.18) for d in (22, 25, 30)]
        self.assertIsNone(fx_effect(prev + now, self.cfg, TODAY))

    def test_too_few_exact_operations(self):
        txs = [t for t in window_txs(0.16, 0.18) if t.day != date(2026, 10, 30)]  # в текущем окне 2 точные
        txs = [t for t in txs if t.day != date(2026, 11, 10)] + [kzt(date(2026, 11, 10), 100000, 0.18, exact=False)]
        self.assertIsNone(fx_effect(txs, self.cfg, TODAY))

    def test_other_currency_is_ignored(self):
        txs = [Tx(t.day, t.kind, t.amount, t.category, t.description, "EUR", t.original, t.exact_rate)
               for t in window_txs(0.16, 0.18)]
        self.assertIsNone(fx_effect(txs, self.cfg, TODAY))

    def test_report_contains_fx_block(self):
        report = build_report(window_txs(0.16, 0.18), self.cfg, TODAY)
        self.assertEqual(report["fx"]["currency"], "KZT")
        self.assertAlmostEqual(report["fx"]["effect_rub"], 2000)
        report = build_report([], make_cfg(), TODAY)
        self.assertIsNone(report["fx"])


if __name__ == "__main__":
    unittest.main()
