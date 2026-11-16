import copy
import json
import unittest
from datetime import date
from pathlib import Path

from finportfolio.model import (
    FROZEN, RESERVE, PortfolioError, load_policy, load_snapshot, policy_from_dict, snapshot_from_dict,
)

ROOT = Path(__file__).resolve().parents[1]


def raw_policy() -> dict:
    return json.loads((ROOT / "policy.example.json").read_text(encoding="utf-8"))


def raw_snapshot() -> dict:
    return json.loads((ROOT / "snapshot.example.json").read_text(encoding="utf-8"))


class ModelTests(unittest.TestCase):
    def test_example_files_load(self):
        policy = load_policy(ROOT / "policy.example.json")
        snap = load_snapshot(ROOT / "snapshot.example.json", policy)
        self.assertEqual(snap.day, date(2026, 1, 31))
        self.assertEqual(len(snap.positions), 5)
        btc = next(p for p in snap.positions if p.ticker == "BTC")
        self.assertEqual(btc.value_rub, 300000)
        self.assertEqual(btc.cls, "c")
        self.assertEqual(snap.warnings, ("Биржа: итог не сверён",))
        self.assertEqual({RESERVE, FROZEN}, {"reserve", "frozen"})

    def test_targets_must_sum_to_one(self):
        raw = raw_policy()
        raw["classes"][0]["target"] = 0.6
        with self.assertRaisesRegex(PortfolioError, "1"):
            policy_from_dict(raw)

    def test_policy_needs_a_class_for_new_money(self):
        raw = raw_policy()
        for c in raw["classes"]:
            c["new_money"] = False
        with self.assertRaisesRegex(PortfolioError, "new_money"):
            policy_from_dict(raw)

    def test_class_id_must_not_be_reserved(self):
        raw = raw_policy()
        raw["classes"][0]["id"] = "reserve"
        with self.assertRaises(PortfolioError):
            policy_from_dict(raw)

    def test_unknown_class_names_position(self):
        policy = policy_from_dict(raw_policy())
        raw = raw_snapshot()
        raw["accounts"][0]["positions"][1]["class"] = "zzz"
        with self.assertRaisesRegex(PortfolioError, "Фонд акций"):
            snapshot_from_dict(raw, policy)

    def test_missing_fx_rate(self):
        policy = policy_from_dict(raw_policy())
        raw = raw_snapshot()
        raw["fx"] = {}
        with self.assertRaisesRegex(PortfolioError, "USD"):
            snapshot_from_dict(raw, policy)

    def test_total_mismatch_names_account(self):
        policy = policy_from_dict(raw_policy())
        raw = raw_snapshot()
        raw["accounts"][0]["stated_total"] = 790000
        with self.assertRaisesRegex(PortfolioError, "Счёт 1"):
            snapshot_from_dict(raw, policy)

    def test_total_within_tolerance(self):
        policy = policy_from_dict(raw_policy())
        raw = raw_snapshot()
        raw["accounts"][0]["stated_total"] = 780005
        snapshot_from_dict(raw, policy)

    def test_negative_value(self):
        policy = policy_from_dict(raw_policy())
        raw = raw_snapshot()
        raw["accounts"][0]["stated_total"] = None
        raw["accounts"][0]["positions"][0]["value"] = -1
        with self.assertRaisesRegex(PortfolioError, "Фонд ликвидности"):
            snapshot_from_dict(raw, policy)

    def test_empty_account(self):
        policy = policy_from_dict(raw_policy())
        raw = copy.deepcopy(raw_snapshot())
        raw["accounts"][1]["positions"] = []
        with self.assertRaisesRegex(PortfolioError, "Биржа"):
            snapshot_from_dict(raw, policy)


if __name__ == "__main__":
    unittest.main()
