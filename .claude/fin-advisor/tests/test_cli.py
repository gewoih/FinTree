import os
import tempfile
import unittest
from unittest import mock

from finmetrics.__main__ import load_local_secrets
from finmetrics.api import FinTreeClient


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
