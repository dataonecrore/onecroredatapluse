import os
import unittest
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    status_code = 200


class PasswordRecoveryTests(unittest.TestCase):
    def test_loopback_redirect_is_replaced_by_default(self):
        self.assertEqual(
            main.resolve_frontend_url("http://localhost:3000"),
            main.DEFAULT_FRONTEND_URL,
        )

    def test_local_development_requires_explicit_loopback_opt_in(self):
        self.assertEqual(
            main.resolve_frontend_url("http://localhost:5173/", allow_loopback=True),
            "http://localhost:5173",
        )

    def test_invalid_frontend_url_fails_closed(self):
        with self.assertRaises(RuntimeError):
            main.resolve_frontend_url("onecroredatapluse.vercel.app")

    @patch("backend.main.requests.post")
    def test_password_reset_sends_production_redirect(self, request_post):
        request_post.return_value = FakeResponse()

        with patch.object(main, "FRONTEND_URL", main.DEFAULT_FRONTEND_URL):
            result = main.password_reset(
                main.PasswordResetRequest(email="member@example.com")
            )

        self.assertIn("recovery instructions", result["message"])
        self.assertEqual(
            request_post.call_args.kwargs["json"],
            {
                "email": "member@example.com",
                "redirect_to": "https://onecroredatapluse.vercel.app",
            },
        )


if __name__ == "__main__":
    unittest.main()
