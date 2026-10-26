import os
import shutil
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.entities import Business, Document
from backend.app.models.schemas import DocumentOut
from backend.app.services.document_parser import (
    sanitize_filename,
    parse_pdf,
    preview_tabular_file,
    MAX_FILE_SIZE_BYTES,
    ALLOWED_EXTENSIONS
)

router = APIRouter(prefix="/api/businesses/{business_id}/documents", tags=["documents"])

@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    business_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    original_filename = file.filename or "upload"
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    safe_name = sanitize_filename(original_filename)
    business_dir = os.path.join(settings.UPLOAD_DIR, business_id)
    os.makedirs(business_dir, exist_ok=True)
    target_path = os.path.join(business_dir, f"{os.urandom(6).hex()}_{safe_name}")

    # Read and check size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
        )

    with open(target_path, "wb") as f:
        f.write(file_bytes)

    extracted_text = ""
    page_count = 0
    doc_status = "ready"
    metadata_json = "{}"

    # Extract if PDF
    if ext == ".pdf":
        try:
            extracted_text, page_count, meta = parse_pdf(target_path)
            import json
            metadata_json = json.dumps(meta)
        except Exception as e:
            doc_status = "error"
            extracted_text = f"Failed to extract PDF text: {str(e)}"

    doc = Document(
        business_id=business_id,
        filename=os.path.basename(target_path),
        original_name=original_filename,
        mime_type=file.content_type or "application/octet-stream",
        storage_path=target_path,
        extracted_text=extracted_text,
        page_count=page_count,
        status=doc_status,
        metadata_json=metadata_json
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("", response_model=List[DocumentOut])
def list_documents(business_id: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return db.query(Document).filter(Document.business_id == business_id).order_by(Document.created_at.desc()).all()

@router.get("/{document_id}/preview")
def preview_document(business_id: str, document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id, Document.business_id == business_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    ext = os.path.splitext(doc.original_name)[1].lower()
    if ext in (".csv", ".xlsx", ".xls"):
        try:
            return preview_tabular_file(doc.storage_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to preview tabular file: {str(e)}")
    elif ext == ".pdf":
        return {
            "type": "pdf",
            "page_count": doc.page_count,
            "text_excerpt": (doc.extracted_text or "")[:4000],
            "total_chars": len(doc.extracted_text or "")
        }
    else:
        return {"type": "unknown", "filename": doc.original_name}

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(business_id: str, document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id, Document.business_id == business_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return None
