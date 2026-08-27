import io
import tempfile
import unittest
from pathlib import Path

from backend.bulk_import import (
    CustomerRow,
    RejectedRow,
    file_sha256,
    iter_file_batches,
    iter_batches,
    canonicalize_headers,
    normalized_phone,
    parse_customer_row,
    validate_headers,
    _insert_staged,
)


COLUMNS = {
    "name": "customer_name",
    "phone": "phone",
    "address": "address",
    "city": None,
    "state": None,
    "pin_code": None,
    "source_id": None,
}

CONFIRMED_COLUMNS = {
    "name": "Customer Name",
    "phone": "Customer Phone",
    "address": "Customer Address",
    "house_no": "House No",
    "street": "Street",
    "village": "Village",
    "post_office": "Post office",
    "city": "City",
    "state": "State",
    "pin_code": "PIN Code",
    "source_id": None,
}


class BulkImportTests(unittest.TestCase):
    def test_customer_adress_header_maps_to_configured_address_column(self):
        headers = canonicalize_headers(
            ["Customer Name", "Customer Phone", "Customer Adress", "City", "State", "PIN Code"],
            {
                "name": "Customer Name",
                "phone": "Customer Phone",
                "address": "Customer Address",
                "city": "City",
                "state": "State",
                "pin_code": "PIN Code",
                "source_id": None,
            },
        )

        self.assertEqual(headers[2], "Customer Address")

    def test_staged_insert_targets_live_name_column(self):
        class Cursor:
            statement = ""

            def execute(self, statement, _parameters):
                self.statement = statement

            def fetchone(self):
                return (2,)

        cursor = Cursor()
        inserted = _insert_staged(cursor, "00000000-0000-0000-0000-000000000000", "preserve")
        self.assertEqual(inserted, 2)
        self.assertIn("insert into public.customers", cursor.statement)
        self.assertIn("name, phone, address", cursor.statement)
        self.assertNotIn("customer_name, phone, address", cursor.statement)

    def test_normalized_phone_keeps_digits_only(self):
        self.assertEqual(normalized_phone("+91 (987) 65-43210"), "919876543210")

    def test_valid_row_keeps_address_for_display(self):
        result = parse_customer_row(
            {"customer_name": " Asha ", "phone": " 123-456 ", "address": " Pune "},
            7,
            COLUMNS,
        )
        self.assertEqual(result, CustomerRow(7, "Asha", "123-456", "Pune", None))

    def test_customer_without_phone_is_accepted(self):
        result = parse_customer_row(
            {"customer_name": "Asha", "phone": "", "address": "Pune"},
            8,
            COLUMNS,
        )
        self.assertEqual(result, CustomerRow(8, "Asha", None, "Pune", None))

    def test_confirmed_columns_combine_and_clean_full_address(self):
        result = parse_customer_row(
            {
                "Customer Name": " Priya   Reddy ",
                "Customer Phone": " 9000000002 ",
                "Customer Address": "45, Green Park Colony,   Kondapur",
                "City": " Hyderabad ",
                "State": " Telangana ",
                "PIN Code": " 500084 ",
            },
            2,
            CONFIRMED_COLUMNS,
        )
        self.assertEqual(
            result,
            CustomerRow(
                2,
                "Priya Reddy",
                "9000000002",
                "45, Green Park Colony, Kondapur, Hyderabad, Telangana, 500084",
                None,
            ),
        )

    def test_split_columns_combine_and_clean_full_address(self):
        columns = {
            **CONFIRMED_COLUMNS,
            "address": None,
        }
        result = parse_customer_row(
            {
                "Customer Name": "Tumma Govardhan",
                "Customer Phone": "919949024248",
                "House No": "26/5/4/3/1",
                "Street": " BALRAM NAGAR ",
                "Village": " BALRAMNAGAR ",
                "Post office": " MALKajgiri ",
                "PIN Code": 500047,
            },
            2,
            columns,
        )
        self.assertEqual(result.address, "26/5/4/3/1, BALRAM NAGAR, BALRAMNAGAR, MALKajgiri, 500047")

    def test_invalid_rows_do_not_retain_pii_in_rejection(self):
        result = parse_customer_row(
            {"customer_name": "", "phone": "999999", "address": "Secret address"},
            2,
            COLUMNS,
        )
        self.assertIsInstance(result, RejectedRow)
        self.assertEqual(result.error_code, "missing_name")
        self.assertNotIn("Secret", result.error_message)

    def test_batches_resume_after_committed_source_row(self):
        source = io.StringIO(
            "customer_name,phone,address\n"
            "First,111,One\n"
            "Second,222,Two\n"
            "Third,333,Three\n"
        )
        batches = list(iter_batches(source, COLUMNS, batch_size=2, after_source_row=1))
        self.assertEqual(len(batches), 1)
        accepted, rejected, end = batches[0]
        self.assertEqual([row.source_row for row in accepted], [2, 3])
        self.assertEqual(rejected, [])
        self.assertEqual(end, 3)

    def test_confirmed_csv_parses_quoted_address_commas(self):
        source = io.StringIO(
            "Customer Name,Customer Phone,Customer Address,City,State,PIN Code\n"
            'Aarav Sharma,9000000001,"12, Lake View Road, Banjara Hills",'
            "Hyderabad,Telangana,500034\n"
        )
        batches = list(iter_batches(source, CONFIRMED_COLUMNS, batch_size=10))
        accepted, rejected, end = batches[0]
        self.assertEqual(rejected, [])
        self.assertEqual(end, 1)
        self.assertEqual(
            accepted[0].address,
            "12, Lake View Road, Banjara Hills, Hyderabad, Telangana, 500034",
        )

    def test_phone_header_is_optional(self):
        validate_headers(["customer_name", "address"], COLUMNS)

    def test_skip_phone_deduplication_preserves_rows_without_phone(self):
        class Cursor:
            statement = ""

            def execute(self, statement, _parameters):
                self.statement = statement

            def fetchone(self):
                return (2,)

        cursor = Cursor()
        _insert_staged(
            cursor,
            "00000000-0000-0000-0000-000000000000",
            "skip-phone",
        )

        self.assertIn("normalized_phone is null or duplicate_rank = 1", cursor.statement)
        self.assertIn("stage.normalized_phone is null or not exists", cursor.statement)

    def test_file_checksum_is_stable(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "customers.csv"
            path.write_bytes(b"customer_name,phone,address\nA,123,X\n")
            self.assertEqual(file_sha256(path), file_sha256(path))

    def test_xlsx_rows_are_streamed_in_batches(self):
        from openpyxl import Workbook

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "customers.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(["Customer Name", "Customer Phone", "Customer Address", "City", "State", "PIN Code"])
            sheet.append(["First", 111, "One", "Pune", "Maharashtra", 411001])
            sheet.append(["Second", 222, "Two", "Delhi", "Delhi", 110001])
            workbook.save(path)

            batches = list(iter_file_batches(path, CONFIRMED_COLUMNS, batch_size=1))

        self.assertEqual(len(batches), 2)
        self.assertEqual(batches[0][0][0].customer_name, "First")
        self.assertEqual(batches[1][0][0].source_row, 2)


if __name__ == "__main__":
    unittest.main()
