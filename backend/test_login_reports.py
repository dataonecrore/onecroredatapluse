import os
import unittest
from pathlib import Path
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    def __init__(self, data=None, status_code=200):
        self._data = data
        self.status_code = status_code
        self.text = ""

    def json(self):
        return self._data


class LoginReportTests(unittest.TestCase):
    @patch("backend.main.requests.post")
    def test_successful_login_event_records_server_side_identity(self, request_post):
        request_post.return_value = FakeResponse([], status_code=201)

        recorded = main.record_login_event(
            {
                "id": "user-id",
                "email": "MEMBER@example.com",
                "user_metadata": {"name": "Member Name"},
            }
        )

        self.assertTrue(recorded)
        self.assertEqual(
            request_post.call_args.kwargs["json"],
            {
                "user_id": "user-id",
                "user_email": "member@example.com",
                "user_name": "Member Name",
            },
        )
        self.assertEqual(request_post.call_args.kwargs["headers"], main.HEADERS)

    @patch("backend.main.requests.get")
    @patch("backend.main.requests.post")
    def test_admin_report_combines_summary_and_recent_logins(self, request_post, request_get):
        request_post.return_value = FakeResponse(
            {
                "period": "weekly",
                "total_logins": 4,
                "unique_users": 2,
                "series": [],
            }
        )
        request_get.return_value = FakeResponse(
            [
                {
                    "id": 9,
                    "user_id": "user-id",
                    "user_email": "member@example.com",
                    "user_name": "Member Name",
                    "occurred_at": "2026-08-20T10:00:00Z",
                }
            ]
        )

        result = main.get_login_activity_report(
            period="weekly",
            recent_limit=25,
            _={"role": "admin"},
        )

        self.assertEqual(result["total_logins"], 4)
        self.assertEqual(result["recent_logins"][0]["id"], 9)
        self.assertEqual(
            request_post.call_args.kwargs["json"],
            {"p_period": "weekly"},
        )
        self.assertEqual(request_get.call_args.kwargs["params"]["limit"], "25")

    def test_migration_keeps_login_events_server_only_and_indexed(self):
        migration = (
            Path(__file__).parents[1]
            / "supabase"
            / "migrations"
            / "20260820160010_login_events_reports.sql"
        ).read_text(encoding="utf-8").lower()

        self.assertIn("alter table public.login_events enable row level security", migration)
        self.assertIn("revoke all on table public.login_events from public, anon, authenticated", migration)
        self.assertIn("grant select, insert on table public.login_events to service_role", migration)
        self.assertIn("login_events_occurred_at_idx", migration)
        self.assertIn("security invoker", migration)


if __name__ == "__main__":
    unittest.main()
