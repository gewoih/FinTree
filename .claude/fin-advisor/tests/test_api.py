import unittest
from datetime import date
from urllib.parse import parse_qs, urlparse

from finmetrics.api import ApiError, FinTreeClient


class ApiTests(unittest.TestCase):
    def test_fetch_all_pages_stops_on_empty_page(self):
        pages = {1: 200, 2: 200, 3: 0}
        requested = []

        def fake_fetch(url):
            query = parse_qs(urlparse(url).query)
            page = int(query["page"][0])
            requested.append(page)
            self.assertEqual(query["size"], ["200"])
            self.assertEqual(query["from"], ["2026-02-01"])
            return {"items": [{"id": f"{page}-{i}"} for i in range(pages[page])], "total": 100}

        client = FinTreeClient("https://example.test", "ftpat_x", fetch=fake_fetch)
        result = client.transactions(date(2026, 2, 1))
        self.assertEqual(len(result), 400)
        self.assertEqual(requested, [1, 2, 3])

    def test_fetch_stops_on_partial_page(self):
        requested = []

        def fake_fetch(url):
            page = int(parse_qs(urlparse(url).query)["page"][0])
            requested.append(page)
            return {"items": [{}] * (200 if page == 1 else 7)}

        client = FinTreeClient("https://example.test", "ftpat_x", fetch=fake_fetch)
        self.assertEqual(len(client.transactions(date(2026, 2, 1))), 207)
        self.assertEqual(requested, [1, 2])

    def test_categories_map_id_to_name(self):
        client = FinTreeClient("https://example.test", "t", fetch=lambda url: [{"id": "a", "name": "Кафе"}])
        self.assertEqual(client.categories(), {"a": "Кафе"})

    def test_notify_posts_plain_text(self):
        sent = []
        client = FinTreeClient("https://example.test/", "t", fetch=lambda url: None,
                               post=lambda url, body: sent.append((url, body)))
        client.notify("Привет <b>")
        self.assertEqual(sent, [("https://example.test/api/users/me/notify",
                                 {"text": "Привет <b>", "format": "Plain"})])

    def test_notify_rejects_too_long_text(self):
        client = FinTreeClient("https://example.test", "t", fetch=lambda url: None, post=lambda url, body: None)
        with self.assertRaises(ValueError):
            client.notify("x" * 4097)

    def test_transient_errors_are_retried(self):
        calls, sleeps = [], []

        def flaky(url):
            calls.append(url)
            if len(calls) < 3:
                raise ApiError("reset", transient=True)
            return [{"id": "a", "name": "Кафе"}]

        client = FinTreeClient("https://x.test", "t", fetch=flaky, sleep=sleeps.append)
        self.assertEqual(client.categories(), {"a": "Кафе"})
        self.assertEqual(len(calls), 3)
        self.assertEqual(sleeps, [2, 4])

    def test_permanent_errors_are_not_retried(self):
        calls = []

        def denied(url):
            calls.append(url)
            raise ApiError("401", transient=False)

        client = FinTreeClient("https://x.test", "t", fetch=denied, sleep=lambda s: None)
        with self.assertRaises(ApiError):
            client.categories()
        self.assertEqual(len(calls), 1)

    def test_gives_up_after_max_attempts(self):
        calls = []

        def down(url):
            calls.append(url)
            raise ApiError("reset", transient=True)

        client = FinTreeClient("https://x.test", "t", fetch=down, sleep=lambda s: None)
        with self.assertRaises(ApiError):
            client.categories()
        self.assertEqual(len(calls), 5)

    def test_retrospective_returns_dict(self):
        seen = []
        client = FinTreeClient("https://x.test", "t",
                               fetch=lambda url: seen.append(url) or {"month": "2026-11", "nextMonthPlan": "p"})
        self.assertEqual(client.retrospective("2026-11")["nextMonthPlan"], "p")
        self.assertEqual(seen, ["https://x.test/api/retrospectives/2026-11"])

    def test_retrospective_404_returns_none(self):
        def missing(url):
            raise ApiError("404", status=404)

        client = FinTreeClient("https://x.test", "t", fetch=missing, sleep=lambda s: None)
        self.assertIsNone(client.retrospective("2026-11"))

    def test_retrospective_other_errors_propagate(self):
        def denied(url):
            raise ApiError("401", status=401)

        client = FinTreeClient("https://x.test", "t", fetch=denied, sleep=lambda s: None)
        with self.assertRaises(ApiError):
            client.retrospective("2026-11")

    def test_retrospective_rejects_bad_month(self):
        client = FinTreeClient("https://x.test", "t", fetch=lambda url: {})
        with self.assertRaises(ValueError):
            client.retrospective("2026/11")

    def test_page_size_is_200(self):
        seen = []
        client = FinTreeClient("https://x.test", "t",
                               fetch=lambda url: seen.append(url) or {"items": []})
        client.transactions(date(2026, 2, 1))
        self.assertIn("size=200", seen[0])


if __name__ == "__main__":
    unittest.main()
