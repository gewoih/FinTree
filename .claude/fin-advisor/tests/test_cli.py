import os
import tempfile
import unittest
from unittest import mock

from datetime import date

from finmetrics.__main__ import _invest_plan, load_local_secrets
from finmetrics.api import ApiError, FinTreeClient


class CliTests(unittest.TestCase):
    def test_load_local_secrets_sets_missing_env_only(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "secrets.env")
            with open(path, "w", encoding="utf-8") as f:
                f.write("# comment\nFINTREE_PAT=ftpat_abc\nFINTREE_BASE_URL=https://x.test\n")
            with mock.patch.dict(os.environ, {"FINTREE_BASE_URL": "https://keep.test"}, clear=True):
                load_local_secrets(path)
                self.assertEqual(os.environ["FINTREE_PAT"], "ftpat_abc")
                self.assertEqual(os.environ["FINTREE_BASE_URL"], "https://keep.test")

    def test_load_local_secrets_missing_file_is_noop(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            load_local_secrets("/nonexistent/secrets.env")
            self.assertNotIn("FINTREE_PAT", os.environ)

    def test_put_retrospective(self):
        sent = []
        client = FinTreeClient("https://x.test", "t", fetch=lambda u: None,
                               put=lambda url, body: sent.append((url, body)))
        client.put_retrospective("2026-11", {"conclusion": "ok"})
        self.assertEqual(sent, [("https://x.test/api/retrospectives/2026-11",
                                 {"conclusion": "ok", "month": "2026-11"})])

    def test_put_retrospective_rejects_bad_month(self):
        client = FinTreeClient("https://x.test", "t", fetch=lambda u: None, put=lambda url, body: None)
        with self.assertRaises(ValueError):
            client.put_retrospective("2026-1", {})


if __name__ == "__main__":
    unittest.main()


PLAN = "[пополнения] Резерв=17; Акции=69; Облигации=14"


class InvestPlanTests(unittest.TestCase):
    def _client(self, by_month):
        def fetch(url):
            month = url.rsplit("/", 1)[1]
            result = by_month.get(month)
            if isinstance(result, ApiError):
                raise result
            return result  # None → ретроспективы нет

        def get(url):
            result = fetch(url)
            if result is None:
                raise ApiError("404", status=404)
            return result

        return FinTreeClient("https://x.test", "t", fetch=get, sleep=lambda s: None)

    def test_uses_previous_month_plan(self):
        client = self._client({"2026-10": {"nextMonthPlan": PLAN}})
        self.assertEqual(_invest_plan(client, date(2026, 11, 28)), PLAN)

    def test_falls_back_to_month_before_previous(self):
        client = self._client({"2026-10": {"nextMonthPlan": "без строки"}, "2026-09": {"nextMonthPlan": PLAN}})
        self.assertEqual(_invest_plan(client, date(2026, 11, 28)), PLAN)

    def test_older_plans_are_ignored(self):
        client = self._client({"2026-08": {"nextMonthPlan": PLAN}})
        self.assertIsNone(_invest_plan(client, date(2026, 11, 28)))

    def test_api_failure_means_no_plan(self):
        client = self._client({"2026-10": ApiError("500", status=500), "2026-09": ApiError("500", status=500)})
        self.assertIsNone(_invest_plan(client, date(2026, 11, 28)))
