import os
import pytest
from backend.app.services.document_parser import (
    sanitize_filename,
    preview_tabular_file,
    import_transactions_from_file,
    parse_pdf
)
from backend.app.models.schemas import ColumnMapping
from backend.app.services.sample_seeder import ensure_sample_files_exist, SAMPLE_DIR

def test_sanitize_filename():
    assert sanitize_filename("../../etc/passwd.csv") == "passwd.csv"
    assert sanitize_filename("my report @ $2024!.xlsx") == "my_report____2024_.xlsx"
    assert sanitize_filename("") == "unnamed_file"

def test_tabular_preview_and_import():
    ensure_sample_files_exist()
    csv_path = os.path.join(SAMPLE_DIR, "scenario1_profit_decline.csv")

    preview = preview_tabular_file(csv_path)
    assert "Date" in preview["columns"]
    assert "Amount" in preview["columns"]
    assert "Category" in preview["columns"]
    assert preview["total_rows"] > 0
    assert len(preview["preview_rows"]) > 0

    mapping = ColumnMapping(
        date_col="Date",
        kind_col="Type",
        category_col="Category",
        amount_col="Amount",
        description_col="Description"
    )

    records, imported_count, skipped_count, errors = import_transactions_from_file(csv_path, mapping)
    assert imported_count > 0
    assert len(errors) == 0
    assert records[0]["amount"] > 0
    assert records[0]["kind"] in ("revenue", "expense")

def test_pdf_parsing():
    ensure_sample_files_exist()
    pdf_path = os.path.join(SAMPLE_DIR, "sample_operational_audit.pdf")
    text, page_count, metadata = parse_pdf(pdf_path)
    assert page_count >= 1
    assert "Page" in text or "APEX" in text
