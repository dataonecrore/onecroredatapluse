import os
import unittest
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    status_code = 200
    text = ""

    def json(self):
        return {
            "users": [
                {
                    "id": "registered-user-id",
                    "email": "member@example.com",
                    "user_metadata": {"name": "Member Name"},
                    "app_metadata": {"role": "user"},
                    "created_at": "2026-08-20T10:00:00Z",
                    "last_sign_in_at": "2026-08-20T11:00:00Z",
                }
            ]
        }


class UserListingTests(unittest.TestCase):
    def test_configured_admin_email_overrides_signup_user_metadata(self):
        with patch.object(main, "ADMIN_EMAILS", {"owner@example.com"}):
            role = main.resolve_user_role(
                {
                    "email": "OWNER@example.com",
                    "app_metadata": {"role": "user"},
                }
            )

        self.assertEqual(role, "admin")

    def test_current_user_endpoint_returns_role_without_listing_all_users(self):
        result = main.get_auth_user(
            {
                "id": "admin-id",
                "email": "admin@example.com",
                "role": "admin",
                "user_metadata": {"name": "Admin Name"},
            }
        )

        self.assertEqual(
            result,
            {
                "id": "admin-id",
                "name": "Admin Name",
                "email": "admin@example.com",
                "role": "admin",
            },
        )

    def test_legacy_service_role_key_is_sent_as_bearer_token(self):
        self.assertEqual(
            main.HEADERS["Authorization"],
            f"Bearer {main.SUPABASE_KEY}",
        )

    @patch("backend.main.requests.get")
    def test_admin_can_list_registered_users_with_signup_details(self, request_get):
        request_get.return_value = FakeResponse()

        result = main.list_users(_={"role": "admin"})

        self.assertEqual(result[0]["name"], "Member Name")
        self.assertEqual(result[0]["email"], "member@example.com")
        self.assertEqual(result[0]["role"], "user")
        self.assertEqual(result[0]["created_at"], "2026-08-20T10:00:00Z")
        self.assertEqual(
            request_get.call_args.kwargs["params"],
            {"page": 1, "per_page": 1000},
        )
        self.assertEqual(
            request_get.call_args.kwargs["headers"]["Authorization"],
            f"Bearer {main.SUPABASE_KEY}",
        )


if __name__ == "__main__":
    unittest.main()
