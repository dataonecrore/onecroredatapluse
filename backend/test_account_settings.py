import os
import unittest
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    def __init__(self, data=None, status_code=200):
        self._data = data or {}
        self.status_code = status_code

    def json(self):
        return self._data


class AccountSettingsTests(unittest.TestCase):
    @patch("backend.main.requests.get")
    def test_campaigns_are_listed_for_the_authenticated_workspace(self, request_get):
        request_get.return_value = FakeResponse([{"id": 4, "name": "Welcome back", "status": "draft"}])

        result = main.list_campaigns({"id": "user-id"})

        self.assertEqual(result["items"][0]["name"], "Welcome back")
        self.assertEqual(request_get.call_args.kwargs["params"]["user_id"], "eq.user-id")

    @patch("backend.main.requests.post")
    def test_campaign_creation_trims_fields_and_starts_as_draft(self, request_post):
        request_post.return_value = FakeResponse(
            [{"id": 5, "name": "Weekend offer", "status": "draft"}], status_code=201
        )

        result = main.create_campaign(
            main.CampaignCreate(
                name="  Weekend offer  ",
                channel="whatsapp",
                audience="  VIP customers ",
                message="  Come back this weekend.  ",
            ),
            {"id": "user-id"},
        )

        self.assertEqual(result["status"], "draft")
        self.assertEqual(
            request_post.call_args.kwargs["json"],
            {
                "user_id": "user-id",
                "name": "Weekend offer",
                "channel": "whatsapp",
                "audience": "VIP customers",
                "message": "Come back this weekend.",
                "scheduled_at": None,
                "status": "draft",
            },
        )

    @patch("backend.main.record_login_event")
    @patch("backend.main.requests.get")
    @patch("backend.main.requests.post")
    def test_login_returns_profile_for_settings_and_sidebar(
        self, request_post, request_get, record_login_event
    ):
        request_post.return_value = FakeResponse(
            {"access_token": "user-token", "refresh_token": "refresh-token"}
        )
        request_get.return_value = FakeResponse(
            {
                "id": "user-id",
                "email": "member@example.com",
                "user_metadata": {"name": "Member Name"},
                "app_metadata": {"role": "user"},
            }
        )

        result = main.login(
            main.LoginRequest(email="member@example.com", password="password123")
        )

        self.assertEqual(
            result["user"],
            {
                "id": "user-id",
                "name": "Member Name",
                "email": "member@example.com",
                "role": "user",
            },
        )
        self.assertEqual(result["refresh_token"], "refresh-token")
        record_login_event.assert_called_once()

    @patch("backend.main.requests.post")
    def test_refresh_session_rotates_access_and_refresh_tokens(self, request_post):
        request_post.return_value = FakeResponse(
            {"access_token": "fresh-access", "refresh_token": "fresh-refresh"}
        )

        result = main.refresh_session(main.RefreshSessionRequest(refresh_token="old-refresh"))

        self.assertEqual(
            result,
            {"access_token": "fresh-access", "refresh_token": "fresh-refresh"},
        )
        self.assertIn("grant_type=refresh_token", request_post.call_args.args[0])
        self.assertEqual(
            request_post.call_args.kwargs["json"], {"refresh_token": "old-refresh"}
        )

    @patch("backend.main.requests.post")
    def test_refresh_session_rejects_an_expired_refresh_token(self, request_post):
        request_post.return_value = FakeResponse(status_code=400)

        with self.assertRaises(main.HTTPException) as raised:
            main.refresh_session(main.RefreshSessionRequest(refresh_token="expired-refresh"))

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.detail, "Your session expired. Please sign in again.")

    @patch("backend.main.requests.put")
    def test_authenticated_user_can_update_their_own_name(self, request_put):
        request_put.return_value = FakeResponse(
            {
                "id": "user-id",
                "email": "member@example.com",
                "user_metadata": {"name": "Updated Name", "locale": "en"},
            }
        )

        result = main.update_auth_user_profile(
            main.ProfileUpdateRequest(name="  Updated Name  "),
            credentials=main.HTTPAuthorizationCredentials(
                scheme="Bearer", credentials="user-token"
            ),
            user={
                "id": "user-id",
                "email": "member@example.com",
                "role": "user",
                "user_metadata": {"name": "Old Name", "locale": "en"},
            },
        )

        self.assertEqual(result["name"], "Updated Name")
        self.assertEqual(
            request_put.call_args.kwargs["json"],
            {"data": {"name": "Updated Name", "locale": "en"}},
        )
        self.assertEqual(
            request_put.call_args.kwargs["headers"]["Authorization"],
            "Bearer user-token",
        )

    @patch("backend.main.requests.put")
    @patch("backend.main.requests.post")
    def test_password_change_reauthenticates_before_updating(
        self, request_post, request_put
    ):
        request_post.return_value = FakeResponse({"access_token": "fresh-token"})
        request_put.return_value = FakeResponse({"id": "user-id"})

        result = main.change_auth_user_password(
            main.PasswordChangeRequest(
                current_password="old-password",
                new_password="new-password-123",
            ),
            user={"id": "user-id", "email": "member@example.com", "role": "user"},
        )

        self.assertEqual(result["message"], "Password updated successfully.")
        self.assertEqual(
            request_post.call_args.kwargs["json"],
            {"email": "member@example.com", "password": "old-password"},
        )
        self.assertEqual(
            request_put.call_args.kwargs["headers"]["Authorization"],
            "Bearer fresh-token",
        )
        self.assertEqual(
            request_put.call_args.kwargs["json"],
            {"password": "new-password-123"},
        )

    @patch("backend.main.requests.put")
    @patch("backend.main.requests.post")
    def test_password_change_rejects_incorrect_current_password(
        self, request_post, request_put
    ):
        request_post.return_value = FakeResponse(status_code=400)

        with self.assertRaises(main.HTTPException) as context:
            main.change_auth_user_password(
                main.PasswordChangeRequest(
                    current_password="wrong-password",
                    new_password="new-password-123",
                ),
                user={"id": "user-id", "email": "member@example.com", "role": "user"},
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail, "Current password is incorrect.")
        request_put.assert_not_called()


if __name__ == "__main__":
    unittest.main()
