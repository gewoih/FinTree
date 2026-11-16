import unittest
from datetime import date
from urllib.parse import parse_qs, urlparse

from finmetrics.api import FinTreeClient


class ApiTests(unittest.TestCase):
    def test_fetch_all_pages_stops_on_empty_page(self):
        pages = {1: 50, 2: 50, 3: 0}
        requested = []

        def fake_fetch(url):
            query = parse_qs(urlparse(url).query)
            page = int(query["page"][0])
            requested.append(page)
            self.assertEqual(query["size"], ["50"])
            self.assertEqual(query["from"], ["2026-02-01"])
            return {"items": [{"id": f"{page}-{i}"} for i in range(pages[page])], "total": 100}

        client = FinTreeClient("https://example.test", "ftpat_x", fetch=fake_fetch)
        result = client.transactions(date(2026, 2, 1))
        self.assertEqual(len(result), 100)
        self.assertEqual(requested, [1, 2, 3])

    def test_fetch_stops_on_partial_page(self):
        requested = []

        def fake_fetch(url):
            page = int(parse_qs(urlparse(url).query)["page"][0])
            requested.append(page)
            return {"items": [{}] * (50 if page == 1 else 7)}

        client = FinTreeClient("https://example.test", "ftpat_x", fetch=fake_fetch)
        self.assertEqual(len(client.transactions(date(2026, 2, 1))), 57)
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


if __name__ == "__main__":
    unittest.main()
