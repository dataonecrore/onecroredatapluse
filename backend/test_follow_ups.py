import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class FakeResponse:
    def __init__(self, data, status_code=200, text=""):
        self._data = data
        self.status_code = status_code
        self.text = text

    def json(self):
        return self._data


class FollowUpTests(unittest.TestCase):
    def test_payload_is_trimmed_and_due_date_is_normalized_to_utc(self):
        result = main.prepare_follow_up_payload(
            {
                "subject": "  Call   about renewal  ",
                "notes": "  Confirm   the final price. ",
                "due_at": datetime(2026, 8, 22, 10, 30, tzinfo=timezone.utc),
            }
        )

        self.assertEqual(result["subject"], "Call about renewal")
        self.assertEqual(result["notes"], "Confirm the final price.")
        self.assertEqual(result["due_at"], "2026-08-22T10:30:00+00:00")

    def test_payload_rejects_a_due_date_without_timezone(self):
        with self.assertRaises(main.HTTPException) as context:
            main.prepare_follow_up_payload(
                {"subject": "Call", "due_at": datetime(2026, 8, 22, 10, 30)}
            )

        self.assertEqual(context.exception.status_code, 422)
        self.assertIn("timezone", context.exception.detail)

    @patch("backend.main.requests.get")
    def test_upcoming_list_is_scoped_to_current_user(self, request_get):
        request_get.return_value = FakeResponse([{"id": 10}, {"id": 11}])

        result = main.list_follow_ups(
            state="upcoming",
            limit=1,
            offset=0,
            user={"id": "user-id"},
        )

        self.assertEqual(result["items"], [{"id": 10}])
        self.assertEqual(result["next_offset"], 1)
        params = request_get.call_args.kwargs["params"]
        self.assertEqual(params["user_id"], "eq.user-id")
        self.assertEqual(params["status"], "eq.open")
        self.assertTrue(params["due_at"].startswith("gte."))
        self.assertEqual(params["limit"], "2")

    @patch("backend.main.requests.post")
    @patch("backend.main.requests.get")
    def test_create_verifies_customer_and_sets_owner(self, request_get, request_post):
        customer = {"id": 42, "name": "Asha Rao", "phone": "9876543210"}
        request_get.return_value = FakeResponse([customer])
        request_post.return_value = FakeResponse(
            [{"id": 7, "customer_id": 42, "subject": "Call Asha"}],
            status_code=201,
        )

        result = main.create_follow_up(
            main.FollowUpCreate(
                customer_id=42,
                subject=" Call Asha ",
                due_at=datetime(2026, 8, 22, 10, 30, tzinfo=timezone.utc),
                priority="high",
                channel="call",
            ),
            user={"id": "user-id"},
        )

        self.assertEqual(result["customer"], customer)
        body = request_post.call_args.kwargs["json"]
        self.assertEqual(body["user_id"], "user-id")
        self.assertEqual(body["customer_id"], 42)
        self.assertEqual(body["subject"], "Call Asha")

    @patch("backend.main.requests.patch")
    def test_complete_is_scoped_and_sets_completion_time(self, request_patch):
        request_patch.return_value = FakeResponse([{"id": 7, "status": "completed"}])

        result = main.update_follow_up_status(
            7,
            main.FollowUpStatusUpdate(status="completed"),
            user={"id": "user-id"},
        )

        self.assertEqual(result["status"], "completed")
        params = request_patch.call_args.kwargs["params"]
        body = request_patch.call_args.kwargs["json"]
        self.assertEqual(params["user_id"], "eq.user-id")
        self.assertIsNotNone(body["completed_at"])

    @patch("backend.main.requests.delete")
    def test_delete_cannot_report_success_for_an_unowned_record(self, request_delete):
        request_delete.return_value = FakeResponse([])

        with self.assertRaises(main.HTTPException) as context:
            main.delete_follow_up(7, user={"id": "user-id"})

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(
            request_delete.call_args.kwargs["params"]["user_id"],
            "eq.user-id",
        )

    @patch("backend.main.requests.get")
    def test_missing_follow_up_migration_returns_actionable_error(self, request_get):
        request_get.return_value = FakeResponse(
            {"message": "Could not find the table public.follow_ups"},
            status_code=404,
            text="Could not find the table public.follow_ups",
        )

        with self.assertRaises(main.HTTPException) as context:
            main.list_follow_ups(
                state="upcoming",
                limit=50,
                offset=0,
                user={"id": "user-id"},
            )

        self.assertEqual(context.exception.status_code, 503)
        self.assertIn("Apply the follow-up database migration", context.exception.detail)


if __name__ == "__main__":
    unittest.main()
