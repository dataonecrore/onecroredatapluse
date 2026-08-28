import os
import unittest
from pathlib import Path
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
        self.assertEqual(
            main.normalize_name_query("Sai, Prasadgoud, Sanam"),
            "sai prasadgoud sanam",
        )
        with self.assertRaises(ValueError):
            main.normalize_name_query("**")
        with self.assertRaises(ValueError):
            main.normalize_name_query("ab")
        with self.assertRaises(ValueError):
            main.normalize_name_query("Sai Pr")

    def test_builds_order_independent_word_prefix_query(self):
        self.assertEqual(
            main.build_name_prefix_tsquery("sai san prasadgoud"),
            "sai:* & san:* & prasadgoud:*",
        )

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

    @patch("backend.main.requests.post")
    def test_name_search_uses_indexed_word_prefix_rpc(self, request_post):
        request_post.return_value = FakeResponse([])

        result = main.search_customers(
            q="Sai, Sanam",
            field="name",
            limit=25,
            cursor=100,
            _={"id": "user"},
        )

        self.assertEqual(result["items"], [])
        self.assertEqual(result["query"], "sai sanam")
        self.assertTrue(
            request_post.call_args.args[0].endswith(
                "/rpc/search_customers_by_name_prefixes"
            )
        )
        payload = request_post.call_args.kwargs["json"]
        self.assertEqual(payload["p_query"], "sai:* & sanam:*")
        self.assertEqual(payload["p_limit"], 26)
        self.assertEqual(payload["p_after_id"], 100)
        params = request_post.call_args.kwargs["params"]
        self.assertEqual(params["select"], main.CUSTOMER_SEARCH_COLUMNS)
        self.assertNotIn("address", params)

    def test_name_search_migration_is_indexed_and_service_role_only(self):
        migration_dir = Path(__file__).parents[1] / "supabase" / "migrations"
        index_sql = (
            migration_dir / "20260828072859_add_customer_name_word_prefix_index.sql"
        ).read_text(encoding="utf-8").casefold()
        function_sql = (
            migration_dir / "20260828072900_add_customer_name_word_prefix_search.sql"
        ).read_text(encoding="utf-8").casefold()

        self.assertIn("create index concurrently", index_sql)
        self.assertIn("using gin", index_sql)
        self.assertIn("to_tsvector('simple'::regconfig", index_sql)
        self.assertIn("security invoker", function_sql)
        self.assertIn("to_tsquery('simple'::regconfig", function_sql)
        self.assertIn("revoke execute", function_sql)
        self.assertIn("grant execute", function_sql)

    @patch("backend.main.requests.get")
    def test_voter_id_search_uses_normalized_identity_column(self, request_get):
        request_get.return_value = FakeResponse([])

        main.search_customers(
            q="AB 123",
            field="voter_id",
            limit=25,
            cursor=None,
            _={"id": "user"},
        )

        params = request_get.call_args.kwargs["params"]
        self.assertEqual(params["normalized_voter_id"], "like.ab123*")

    @patch("backend.main.requests.get")
    def test_aadhar_search_uses_normalized_identity_column(self, request_get):
        request_get.return_value = FakeResponse([])

        main.search_customers(
            q="1234 5678",
            field="aadhar",
            limit=25,
            cursor=None,
            _={"id": "user"},
        )

        params = request_get.call_args.kwargs["params"]
        self.assertEqual(params["normalized_aadhar"], "like.12345678*")


if __name__ == "__main__":
    unittest.main()
