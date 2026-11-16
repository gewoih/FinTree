import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from finportfolio.__main__ import main
from tests.test_portfolio_model import ROOT, raw_snapshot

POLICY = str(ROOT / "policy.example.json")
SNAPSHOT = str(ROOT / "snapshot.example.json")
CONFIG = str(ROOT / "config.example.json")


def run(argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = main(argv)
    return code, out.getvalue(), err.getvalue()


class CliTests(unittest.TestCase):
    def test_report_keys_and_json(self):
        code, out, _ = run(["report", SNAPSHOT, "--contribution", "120000", "--policy", POLICY, "--config", CONFIG])
        self.assertEqual(code, 0)
        report = json.loads(out)
        self.assertEqual(set(report), {"date", "total", "reserve", "frozen", "long_term", "classes",
                                       "issuers_over_limit", "split", "stress", "sale_tax", "fi", "tax", "warnings"})
        self.assertEqual(report["split"]["marker"], "[пополнения] Резерв=17; Акции=69; Облигации=14")
        self.assertEqual(report["reserve"], {"value": 80000, "target": 100000, "surplus": 0})
        self.assertEqual(report["date"], "2026-01-31")
        self.assertEqual(report["tax"]["default_rate"], 0.13)
        self.assertEqual(report["warnings"], ["Биржа: итог не сверён"])

    def test_report_months_to_target_uses_full_contribution(self):
        _, out, _ = run(["report", SNAPSHOT, "--contribution", "120000", "--policy", POLICY, "--config", CONFIG])
        crypto = next(c for c in json.loads(out)["classes"] if c["id"] == "c")
        # взнос считается постоянным: (300000 / 0.23 − 1_000_000) / 120000 ≈ 2.54 месяца
        self.assertAlmostEqual(crypto["months_to_target"], 2.54, places=2)

    def test_reserve_deficit_does_not_make_false_sale_candidate(self):
        policy = json.loads(Path(POLICY).read_text(encoding="utf-8"))
        policy["classes"][2]["never_sell"] = False
        snap = raw_snapshot()
        snap["accounts"][0]["stated_total"] = None
        snap["accounts"][0]["positions"] = snap["accounts"][0]["positions"][1:]  # резерв 0 при цели 100000
        snap["accounts"][1]["positions"][0]["value"] = 5000  # крипта 400000 ₽
        with tempfile.TemporaryDirectory() as d:
            paths = {}
            for name, data in (("policy", policy), ("snap", snap)):
                paths[name] = Path(d) / f"{name}.json"
                paths[name].write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            _, out, _ = run(["report", str(paths["snap"]), "--contribution", "100000",
                             "--policy", str(paths["policy"]), "--config", CONFIG])
        crypto = next(c for c in json.loads(out)["classes"] if c["id"] == "c")
        self.assertEqual(crypto["status"], "over")  # разбавление ~6 месяцев < 12, продажа не нужна
        self.assertAlmostEqual(crypto["months_to_target"], 6.39, places=2)

    def test_check_shows_currency_rate_and_account_totals(self):
        _, out, _ = run(["check", SNAPSHOT, "--policy", POLICY])
        self.assertIn("3 750 USD", out)
        self.assertIn("300 000 ₽", out)
        self.assertIn("курс 80", out)
        self.assertIn("итог на скриншоте 780 000", out)
        self.assertIn("сумма позиций 780 000", out)
        self.assertIn("итог на скриншоте не виден", out)  # у «Биржи» stated_total = null

    def test_report_keeps_share_precision(self):
        raw = raw_snapshot()
        raw["accounts"][0]["stated_total"] = None
        raw["accounts"][0]["positions"][1]["value"] = 433333  # доля акций 0.41935…, а не 0.42
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "snap.json"
            path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
            _, out, _ = run(["report", str(path), "--contribution", "1000", "--policy", POLICY, "--config", CONFIG])
        equities = next(c for c in json.loads(out)["classes"] if c["id"] == "a")
        self.assertAlmostEqual(equities["share"], 0.4194, places=4)

    def test_check_ok_returns_zero(self):
        code, out, _ = run(["check", SNAPSHOT, "--policy", POLICY])
        self.assertEqual(code, 0)
        self.assertIn("Фонд акций", out)
        self.assertIn("Биржа: итог не сверён", out)

    def test_check_keeps_commas_in_names(self):
        raw = raw_snapshot()
        raw["accounts"][0]["positions"][1]["name"] = "Фонд, акции"
        raw["accounts"][0]["stated_total"] = None
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "snap.json"
            path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
            _, out, _ = run(["check", str(path), "--policy", POLICY])
        self.assertIn("Фонд, акции", out)
        self.assertIn("400 000 ₽", out)

    def test_check_mismatch_returns_two(self):
        raw = raw_snapshot()
        raw["accounts"][0]["stated_total"] = 790000
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "snap.json"
            path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
            code, out, err = run(["check", str(path), "--policy", POLICY])
        self.assertEqual(code, 2)
        self.assertEqual(out, "")
        self.assertIn("Счёт 1", err)

    def test_missing_policy_file_returns_two(self):
        code, _, err = run(["check", SNAPSHOT, "--policy", "/nonexistent/policy.json"])
        self.assertEqual(code, 2)
        self.assertIn("политики", err)


if __name__ == "__main__":
    unittest.main()
