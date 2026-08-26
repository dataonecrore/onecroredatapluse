import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from openpyxl import Workbook


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class CustomerImportTests(unittest.TestCase):
    def test_import_threshold_defaults_to_ten_megabytes(self):
        self.assertEqual(main.SMALL_IMPORT_SIZE, 10 * 1024 * 1024)

    def test_import_customers_have_matching_bulk_payload_keys(self):
        first = main._build_import_customer(
            {"name": "First", "phone": "111"}
        )
        second = main._build_import_customer(
            {
                "name": "Second",
                "phone": "222",
                "email": "second@example.com",
                "address": "Pune",
            }
        )

        self.assertEqual(set(first), set(second))
        self.assertIsNone(first["email"])
        self.assertEqual(first["status"], "Active")
        self.assertEqual(second["email"], "second@example.com")

    def test_duplicate_lookup_batches_values_by_key(self):
        class Response:
            status_code = 200

            def __init__(self, data):
                self.data = data

            def json(self):
                return self.data

        class Session:
            def __init__(self):
                self.calls = []

            def get(self, url, **kwargs):
                self.calls.append(url)
                if "phone=in." in url:
                    return Response([{"id": 11, "phone": "9000000001"}])
                return Response([{"id": 12, "email": "aarav@example.com"}])

        session = Session()
        customers = [
            {"name": "Aarav", "phone": "9000000001", "email": "aarav@example.com"},
            {"name": "Priya", "phone": "9000000002", "email": "priya@example.com"},
        ]

        duplicate_ids = main._find_duplicates_batch(session, customers, ["phone", "email"])

        self.assertEqual(duplicate_ids, {0: 11})
        self.assertEqual(len(session.calls), 2)

    def test_customer_creation_sends_one_batch(self):
        class Response:
            status_code = 201

            def __init__(self):
                self.text = ""

        class Session:
            def __init__(self):
                self.payload = None

            def post(self, url, **kwargs):
                self.payload = kwargs["json"]
                return Response()

        session = Session()
        customers = [{"name": "Aarav", "phone": "9000000001"}]

        main._create_customers_batch(session, customers)

        self.assertEqual(session.payload, customers)

    def test_vercel_preview_origins_are_allowed_by_cors(self):
        with TestClient(main.app) as client:
            response = client.options(
                "/imports/customers",
                headers={
                    "Origin": "https://onecroredatapluse-git-main-dataonecrore.vercel.app",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["access-control-allow-origin"],
            "https://onecroredatapluse-git-main-dataonecrore.vercel.app",
        )

    def test_local_vite_preview_ports_are_allowed_by_cors(self):
        with TestClient(main.app) as client:
            response = client.options(
                "/imports/customers",
                headers={
                    "Origin": "http://localhost:5174",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["access-control-allow-origin"],
            "http://localhost:5174",
        )

    def test_confirmed_headers_map_to_customer_fields(self):
        row = main.normalize_import_row(
            {
                "Customer Name": " Priya   Reddy ",
                "Customer Phone": 9000000002,
                "Customer Address": "45, Green Park Colony,   Kondapur",
                "City": "Hyderabad",
                "State": "Telangana",
                "PIN Code": 500084,
            }
        )

        self.assertEqual(row["name"], "Priya Reddy")
        self.assertEqual(row["phone"], "9000000002")
        self.assertEqual(
            row["address"],
            "45, Green Park Colony, Kondapur, Hyderabad, Telangana, 500084",
        )

    def test_misspelled_customer_address_header_keeps_full_address(self):
        row = main.normalize_import_row(
            {
                "Customer Name": "Devadas M S",
                "Customer Phone": "9014168580",
                "Customer Adress": "12, Lake View Road",
                "City": "Karkala",
                "State": "Karnataka",
                "PIN Code": 500047,
            }
        )

        self.assertEqual(
            row["address"],
            "12, Lake View Road, Karkala, Karnataka, 500047",
        )

    def test_xlsx_with_confirmed_headers_is_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample_customer_dataset.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(
                [
                    "Customer Name",
                    "Customer Phone",
                    "Customer Address",
                    "City",
                    "State",
                    "PIN Code",
                ]
            )
            sheet.append(
                [
                    "Aarav Sharma",
                    9000000001,
                    "12, Lake View Road, Banjara Hills",
                    "Hyderabad",
                    "Telangana",
                    500034,
                ]
            )
            workbook.save(path)

            rows = main.read_import_rows(path, ".xlsx")

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["name"], "Aarav Sharma")
        self.assertEqual(rows[0]["phone"], "9000000001")
        self.assertEqual(
            rows[0]["address"],
            "12, Lake View Road, Banjara Hills, Hyderabad, Telangana, 500034",
        )

    def test_xlsx_rows_can_be_iterated_without_eager_loading(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "streamed_customers.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(["Customer Name", "Customer Phone"])
            sheet.append(["Aarav Sharma", 9000000001])
            workbook.save(path)

            rows = main.iter_import_rows(path, ".xlsx")
            first_row = next(rows)
            rows.close()

        self.assertEqual(first_row["name"], "Aarav Sharma")
        self.assertEqual(first_row["phone"], "9000000001")

    def test_xlsx_with_display_headers_is_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "display_headers.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(["Name", "Phone Number", "Address"])
            sheet.append(["Aarav Sharma", 9000000001, "12, Lake View Road"])
            workbook.save(path)

            rows = main.read_import_rows(path, ".xlsx")

        self.assertEqual(rows[0]["name"], "Aarav Sharma")
        self.assertEqual(rows[0]["phone"], "9000000001")
        self.assertEqual(rows[0]["address"], "12, Lake View Road")

    def test_common_phone_header_variants_are_accepted(self):
        self.assertEqual(
            main.normalize_import_row(
                {"Full Name": "Aarav Sharma", "Phone No.": 9000000001}
            ),
            {"name": "Aarav Sharma", "phone": "9000000001"},
        )

    def test_customer_spreadsheet_headers_map_to_database_fields(self):
        row = main.normalize_import_row(
            {
                "Name": "Aarav Sharma",
                "Phone Number": 9000000001,
                "Alternate Number": 9000000002,
                "Relationship Type": "Father",
                "Relationship Name": "Ramesh Sharma",
                "Voter ID Number": "ABC1234567",
                "Aadhar Card Number": 123456789012,
                "Email": "aarav@example.com",
                "Adress": "12, Lake View Road",
            }
        )

        self.assertEqual(
            row,
            {
                "name": "Aarav Sharma",
                "phone": "9000000001",
                "whatsapp_phone": "9000000002",
                "relationship_type": "Father",
                "relationship_name": "Ramesh Sharma",
                "voter_id_number": "ABC1234567",
                "aadhar_card_number": "123456789012",
                "email": "aarav@example.com",
                "address": "12, Lake View Road",
            },
        )

    def test_missing_customer_phone_has_clear_error(self):
        with self.assertRaisesRegex(ValueError, "Name and Phone Number"):
            main.validate_import_headers(["Customer Name", "Customer Address"])


if __name__ == "__main__":
    unittest.main()
