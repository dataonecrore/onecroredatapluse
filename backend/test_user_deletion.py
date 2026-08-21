import os
import unittest
import uuid
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    def __init__(self, status_code=200):
        self.status_code = status_code


class UserDeletionTests(unittest.TestCase):
    @patch("backend.main.requests.delete")
    def test_admin_can_delete_another_user(self, request_delete):
        request_delete.return_value = FakeResponse(status_code=200)
        user_id = uuid.UUID("69f2b4ba-a559-4dee-a70a-2de5e8c43c77")

        result = main.delete_auth_user(
            user_id,
            admin={"id": "e5ca52a4-024b-49bd-a102-c329e15e52c8", "role": "admin"},
        )

        self.assertEqual(result["id"], str(user_id))
        self.assertEqual(result["message"], "User account deleted.")
        request_delete.assert_called_once_with(
            f"{main.AUTH_URL}/admin/users/{user_id}",
            headers=main.HEADERS,
            timeout=10,
        )

    @patch("backend.main.requests.delete")
    def test_admin_cannot_delete_their_own_account(self, request_delete):
        user_id = uuid.UUID("e5ca52a4-024b-49bd-a102-c329e15e52c8")

        with self.assertRaises(main.HTTPException) as context:
            main.delete_auth_user(
                user_id,
                admin={"id": str(user_id), "role": "admin"},
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("cannot delete your own", context.exception.detail)
        request_delete.assert_not_called()

    @patch("backend.main.requests.delete")
    def test_delete_failure_returns_safe_error(self, request_delete):
        request_delete.return_value = FakeResponse(status_code=503)

        with self.assertRaises(main.HTTPException) as context:
            main.delete_auth_user(
                uuid.UUID("69f2b4ba-a559-4dee-a70a-2de5e8c43c77"),
                admin={"id": "e5ca52a4-024b-49bd-a102-c329e15e52c8", "role": "admin"},
            )

        self.assertEqual(context.exception.status_code, 502)
        self.assertEqual(context.exception.detail, "Unable to delete the user account.")


if __name__ == "__main__":
    unittest.main()
