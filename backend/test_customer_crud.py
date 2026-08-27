import os
import unittest
from unittest.mock import Mock, patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")

from backend import main


class CustomerCrudTests(unittest.TestCase):
    @patch("backend.main.requests.patch")
    def test_update_customer_preserves_explicit_nulls_and_omits_unsupplied_fields(
        self, request_patch
    ):
        request_patch.return_value = Mock(
            status_code=200,
            json=lambda: [{"id": 7, "email": None}],
        )

        result = main.update_customer(
            7,
            main.CustomerUpdate(email=None),
            _={"id": "admin-id", "role": "admin"},
        )

        self.assertIsNone(result["email"])
        self.assertEqual(request_patch.call_args.kwargs["json"], {"email": None})

    @patch("backend.main.requests.patch")
    def test_update_customer_rejects_an_empty_patch(self, request_patch):
        with self.assertRaises(main.HTTPException) as context:
            main.update_customer(
                7,
                main.CustomerUpdate(),
                _={"id": "admin-id", "role": "admin"},
            )

        self.assertEqual(context.exception.status_code, 400)
        request_patch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
