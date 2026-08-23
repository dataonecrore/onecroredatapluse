import os
import unittest
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    def __init__(self, data, status_code=200, headers=None):
        self._data = data
        self.status_code = status_code
        self.headers = headers or {}

    def json(self):
        return self._data


class UserInviteTests(unittest.TestCase):
    @patch("backend.main.requests.post")
    @patch("backend.main.requests.get")
    def test_invite_surfaces_supabase_rate_limit_without_retry_lookup(
        self, request_get, request_post
    ):
        request_get.return_value = FakeResponse({"users": []})
        request_post.return_value = FakeResponse(
            {"message": "rate limit exceeded"},
            status_code=429,
            headers={"Retry-After": "60"},
        )

        with self.assertRaises(main.HTTPException) as context:
            main.invite_user(
                main.InviteRequest(email="new@example.com", role="user"),
                _={"role": "admin"},
            )

        self.assertEqual(context.exception.status_code, 429)
        self.assertEqual(context.exception.headers, {"Retry-After": "60"})
        self.assertEqual(request_get.call_count, 1)

    @patch("backend.main.requests.post")
    @patch("backend.main.requests.put")
    @patch("backend.main.requests.get")
    def test_existing_user_role_is_updated_without_new_invite(
        self, request_get, request_put, request_post
    ):
        request_get.return_value = FakeResponse(
            {
                "users": [
                    {
                        "id": "existing-user-id",
                        "email": "member@example.com",
                        "app_metadata": {"provider": "email", "role": "user"},
                    }
                ]
            }
        )
        request_put.return_value = FakeResponse({"id": "existing-user-id"})

        result = main.invite_user(
            main.InviteRequest(email="MEMBER@example.com", role="admin"),
            _={"role": "admin"},
        )

        self.assertEqual(result["status"], "existing")
        self.assertIn("already registered", result["message"])
        request_post.assert_not_called()
        self.assertEqual(
            request_put.call_args.kwargs["json"],
            {"app_metadata": {"provider": "email", "role": "admin"}},
        )

    @patch("backend.main.requests.post")
    @patch("backend.main.requests.put")
    @patch("backend.main.requests.get")
    def test_new_user_is_invited_and_role_is_applied(
        self, request_get, request_put, request_post
    ):
        request_get.return_value = FakeResponse({"users": []})
        request_post.return_value = FakeResponse(
            {
                "user": {
                    "id": "invited-user-id",
                    "email": "new@example.com",
                    "app_metadata": {},
                }
            },
            status_code=201,
        )
        request_put.return_value = FakeResponse({"id": "invited-user-id"})

        result = main.invite_user(
            main.InviteRequest(email="new@example.com", role="user"),
            _={"role": "admin"},
        )

        self.assertEqual(result["status"], "invited")
        self.assertEqual(result["message"], "Invitation sent.")
        request_post.assert_called_once()
        self.assertEqual(
            request_put.call_args.kwargs["json"],
            {"app_metadata": {"role": "user"}},
        )
        self.assertEqual(
            request_post.call_args.kwargs["headers"]["Authorization"],
            f"Bearer {main.SUPABASE_KEY}",
        )

    @patch("backend.main.requests.get")
    def test_user_lookup_failure_returns_safe_message(self, request_get):
        request_get.return_value = FakeResponse({}, status_code=503)

        with self.assertRaises(main.HTTPException) as context:
            main.find_auth_user_by_email("member@example.com")

        self.assertEqual(context.exception.status_code, 502)
        self.assertEqual(
            context.exception.detail,
            "Unable to check whether the user already exists.",
        )


if __name__ == "__main__":
    unittest.main()
