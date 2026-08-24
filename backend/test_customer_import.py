import os
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook


os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from backend import main


class CustomerImportTests(unittest.TestCase):
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

    def test_missing_customer_phone_has_clear_error(self):
        with self.assertRaisesRegex(ValueError, "Name and Phone Number"):
            main.validate_import_headers(["Customer Name", "Customer Address"])


if __name__ == "__main__":
    unittest.main()
