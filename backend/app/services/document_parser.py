import os
import re
import pandas as pd
import pymupdf # official import from PyMuPDF
from typing import List, Dict, Any, Tuple, Optional
from backend.app.models.schemas import ColumnMapping

# Max file size limit: 15MB
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".pdf"}

def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and directory traversal attempts."""
    clean = os.path.basename(filename)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean)
    return clean or "unnamed_file"

def parse_pdf(file_path: str) -> Tuple[str, int, Dict[str, Any]]:
    """
    Extracts text from PDF page by page using PyMuPDF.
    Returns: (extracted_text_with_page_citations, page_count, metadata)
    """
    doc = pymupdf.open(file_path)
    page_count = len(doc)
    page_texts = []

    for page_num in range(page_count):
        page = doc[page_num]
        text = page.get_text("text").strip()
        if text:
            page_texts.append(f"--- [Document Page {page_num + 1}] ---\n{text}")

    full_text = "\n\n".join(page_texts)
    metadata = {
        "title": doc.metadata.get("title", ""),
        "author": doc.metadata.get("author", ""),
        "pages": page_count,
        "character_count": len(full_text)
    }
    doc.close()
    return full_text, page_count, metadata

def preview_tabular_file(file_path: str, max_rows: int = 10) -> Dict[str, Any]:
    """
    Returns preview data (columns, first N rows, detected rows count) for CSV or Excel.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        # Try utf-8 then latin-1
        try:
            df = pd.read_csv(file_path, nrows=max_rows)
            total_rows = sum(1 for _ in open(file_path, "r", encoding="utf-8", errors="ignore")) - 1
        except Exception:
            df = pd.read_csv(file_path, nrows=max_rows, encoding="latin-1")
            total_rows = sum(1 for _ in open(file_path, "r", encoding="latin-1", errors="ignore")) - 1
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(file_path, nrows=max_rows)
        # Full df count
        full_df = pd.read_excel(file_path)
        total_rows = len(full_df)
    else:
        raise ValueError(f"Unsupported tabular file format: {ext}")

    columns = [str(c) for c in df.columns]
    # Replace NaN with empty string
    preview_rows = df.fillna("").to_dict(orient="records")

    # Suggest likely column matches
    suggested_date = next((c for c in columns if any(k in c.lower() for k in ["date", "time", "day", "period"])), columns[0] if columns else "")
    suggested_amount = next((c for c in columns if any(k in c.lower() for k in ["amount", "total", "val", "cost", "price", "revenue", "expense"])), columns[1] if len(columns) > 1 else "")
    suggested_category = next((c for c in columns if any(k in c.lower() for k in ["cat", "type", "item", "description", "label", "dept"])), columns[2] if len(columns) > 2 else "")
    suggested_kind = next((c for c in columns if any(k in c.lower() for k in ["kind", "rev", "exp", "direction", "flow"])), None)

    return {
        "columns": columns,
        "total_rows": max(0, total_rows),
        "preview_rows": preview_rows,
        "suggested_mapping": {
            "date_col": suggested_date,
            "amount_col": suggested_amount,
            "category_col": suggested_category,
            "kind_col": suggested_kind,
            "default_kind": "expense"
        }
    }

def import_transactions_from_file(
    file_path: str,
    mapping: ColumnMapping,
    currency: str = "USD"
) -> Tuple[List[Dict[str, Any]], int, int, List[str]]:
    """
    Parses and normalizes transaction records from CSV or XLSX.
    Handles missing, malformed, duplicate rows safely.
    Returns: (valid_records, imported_count, skipped_count, errors)
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        try:
            df = pd.read_csv(file_path)
        except Exception:
            df = pd.read_csv(file_path, encoding="latin-1")
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    errors: List[str] = []
    valid_records: List[Dict[str, Any]] = []
    skipped_count = 0

    # Ensure mapped columns exist
    date_col = mapping.date_col
    amount_col = mapping.amount_col
    category_col = mapping.category_col
    kind_col = mapping.kind_col
    desc_col = mapping.description_col

    for required, name in [(date_col, "Date"), (amount_col, "Amount"), (category_col, "Category")]:
        if required not in df.columns:
            errors.append(f"Mapped {name} column '{required}' not found in file columns: {list(df.columns)}")
            return [], 0, len(df), errors

    # Track seen fingerprints to detect duplicates
    seen_rows = set()

    for idx, row in df.iterrows():
        row_num = idx + 2 # 1-based, accounting for header
        raw_date = row.get(date_col)
        raw_amt = row.get(amount_col)
        raw_cat = row.get(category_col)

        # Validate date
        if pd.isna(raw_date) or str(raw_date).strip() == "":
            skipped_count += 1
            if len(errors) < 10:
                errors.append(f"Row {row_num}: Missing date value.")
            continue

        try:
            # Parse to ISO YYYY-MM-DD
            parsed_date = pd.to_datetime(raw_date).strftime("%Y-%m-%d")
        except Exception:
            skipped_count += 1
            if len(errors) < 10:
                errors.append(f"Row {row_num}: Invalid date format '{raw_date}'.")
            continue

        # Validate amount
        if pd.isna(raw_amt):
            skipped_count += 1
            if len(errors) < 10:
                errors.append(f"Row {row_num}: Missing amount value.")
            continue

        try:
            # Strip currency symbols, commas
            cleaned_amt_str = re.sub(r'[\$,€£\s]', '', str(raw_amt))
            amt = float(cleaned_amt_str)
        except Exception:
            skipped_count += 1
            if len(errors) < 10:
                errors.append(f"Row {row_num}: Could not parse amount '{raw_amt}'.")
            continue

        # Determine kind (revenue vs expense)
        if kind_col and kind_col in df.columns and not pd.isna(row.get(kind_col)):
            val = str(row[kind_col]).strip().lower()
            if any(k in val for k in ["rev", "income", "sale", "inflow", "credit", "+"]):
                kind = "revenue"
            elif any(k in val for k in ["exp", "cost", "outflow", "debit", "spend", "-"]):
                kind = "expense"
            else:
                kind = mapping.default_kind or "expense"
        else:
            # If amount is negative, interpret as expense or revenue based on default
            if amt < 0:
                amt = abs(amt)
                kind = "expense"
            else:
                kind = mapping.default_kind or "expense"

        category = str(raw_cat).strip() if not pd.isna(raw_cat) and str(raw_cat).strip() else "Uncategorized"
        
        description = ""
        if desc_col and desc_col in df.columns and not pd.isna(row.get(desc_col)):
            description = str(row[desc_col]).strip()

        # Deduplicate identical transaction rows
        fingerprint = (parsed_date, kind, category, round(amt, 2), description)
        if fingerprint in seen_rows:
            skipped_count += 1
            continue
        seen_rows.add(fingerprint)

        valid_records.append({
            "date": parsed_date,
            "kind": kind,
            "category": category,
            "amount": round(abs(amt), 2),
            "currency": currency,
            "description": description
        })

    return valid_records, len(valid_records), skipped_count, errors
