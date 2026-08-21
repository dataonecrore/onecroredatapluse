import os
import unittest
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def json(self):
        return self._data


class SignupTests(unittest.TestCase):
    @patch("backend.main.requests.put")
    @patch("backend.main.requests.post")
    def test_signup_explicitly_persists_name_after_user_creation(
        self, request_post, request_put
    ):
        request_post.return_value = FakeResponse(
            {
                "id": "new-user-id",
                "email": "member@example.com",
                "user_metadata": {"email_verified": True},
            },
            status_code=201,
        )
        request_put.return_value = FakeResponse(
            {
                "id": "new-user-id",
                "user_metadata": {
                    "email_verified": True,
                    "name": "Member Name",
                },
            }
        )

        result = main.signup(
            main.SignupRequest(
                email="member@example.com",
                password="password123",
                name="  Member Name  ",
            )
        )

        self.assertEqual(result["message"], "Account created. You can sign in now.")
        self.assertEqual(
            request_post.call_args.kwargs["json"]["user_metadata"],
            {"name": "Member Name"},
        )
        self.assertEqual(
            request_put.call_args.kwargs["json"],
            {
                "user_metadata": {
                    "email_verified": True,
                    "name": "Member Name",
                }
            },
        )

    @patch("backend.main.requests.put")
    @patch("backend.main.requests.post")
    def test_signup_rejects_a_name_that_supabase_does_not_persist(
        self, request_post, request_put
    ):
        request_post.return_value = FakeResponse(
            {"id": "new-user-id", "user_metadata": {}}, status_code=201
        )
        request_put.return_value = FakeResponse(
            {"id": "new-user-id", "user_metadata": {}}, status_code=200
        )

        with self.assertRaises(main.HTTPException) as context:
            main.signup(
                main.SignupRequest(
                    email="member@example.com",
                    password="password123",
                    name="Member Name",
                )
            )

        self.assertEqual(context.exception.status_code, 502)
        self.assertIn("name could not be saved", context.exception.detail)


if __name__ == "__main__":
    unittest.main()
