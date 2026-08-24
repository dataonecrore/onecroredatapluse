import os
import unittest
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    def __init__(self, rows, status_code=200):
        self._rows = rows
        self.status_code = status_code
        self.text = ""

    def json(self):
        return self._rows


class CustomerSearchTests(unittest.TestCase):
    def test_normalizes_name_without_allowing_wildcard_only_query(self):
        self.assertEqual(main.normalize_name_query("  Asha   RAO  "), "asha rao")
        with self.assertRaises(ValueError):
            main.normalize_name_query("**")
        with self.assertRaises(ValueError):
            main.normalize_name_query("ab")

    def test_normalizes_phone_to_digits(self):
        self.assertEqual(main.normalize_phone_query("+91 98765-43210"), "919876543210")
        with self.assertRaises(ValueError):
            main.normalize_phone_query("12")

    def test_auto_field_detects_name_and_phone(self):
        self.assertEqual(main.resolve_search_field("Asha", "auto"), "name")
        self.assertEqual(main.resolve_search_field("98765", "auto"), "phone")

    @patch("backend.main.requests.get")
    def test_phone_search_uses_indexable_prefix_and_cursor(self, request_get):
        request_get.return_value = FakeResponse(
            [
                {"id": 11, "name": "First", "phone": "9876500001", "address": "A"},
                {"id": 12, "name": "Second", "phone": "9876500002", "address": "B"},
            ]
        )

        result = main.search_customers(
            q="987-65",
            field="phone",
            limit=1,
            cursor=10,
            _={"id": "user"},
        )

        self.assertEqual([item["id"] for item in result["items"]], [11])
        self.assertEqual(result["next_cursor"], 11)
        params = request_get.call_args.kwargs["params"]
        self.assertEqual(params["normalized_phone"], "like.98765*")
        self.assertEqual(params["id"], "gt.10")
        self.assertEqual(params["limit"], "2")

    @patch("backend.main.requests.get")
    def test_name_search_uses_trigram_backed_normalized_column(self, request_get):
        request_get.return_value = FakeResponse([])

        result = main.search_customers(
            q="  Asha ",
            field="name",
            limit=25,
            cursor=None,
            _={"id": "user"},
        )

        self.assertEqual(result["items"], [])
        params = request_get.call_args.kwargs["params"]
        self.assertEqual(params["normalized_name"], "like.asha*")
        self.assertNotIn("address", params)


if __name__ == "__main__":
    unittest.main()
