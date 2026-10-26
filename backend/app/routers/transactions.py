from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.entities import Business, Transaction, Document
from backend.app.models.schemas import (
    TransactionOut,
    TransactionImportRequest,
    TransactionImportResponse,
    FinancialMetricsOut
)
from backend.app.services.document_parser import import_transactions_from_file
from backend.app.services.calculator import compute_financial_metrics

router = APIRouter(prefix="/api/businesses/{business_id}", tags=["transactions"])

@router.get("/transactions", response_model=List[TransactionOut])
def list_transactions(
    business_id: str,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    return (
        db.query(Transaction)
        .filter(Transaction.business_id == business_id)
        .order_by(Transaction.date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

@router.post("/transactions/import/{document_id}", response_model=TransactionImportResponse)
def import_transactions(
    business_id: str,
    document_id: str,
    payload: TransactionImportRequest,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    doc = db.query(Document).filter(Document.id == document_id, Document.business_id == business_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    records, imported_count, skipped_count, errors = import_transactions_from_file(
        doc.storage_path,
        payload.mapping,
        currency=business.currency
    )

    if errors and imported_count == 0:
        raise HTTPException(status_code=400, detail={"message": "Import failed", "errors": errors})

    # Bulk insert validated transactions
    for r in records:
        tx = Transaction(
            business_id=business_id,
            date=r["date"],
            kind=r["kind"],
            category=r["category"],
            amount=r["amount"],
            currency=r["currency"],
            description=r.get("description", ""),
            source_id=doc.id
        )
        db.add(tx)

    db.commit()

    return TransactionImportResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        total_processed=imported_count + skipped_count,
        errors=errors[:10]
    )

@router.get("/metrics", response_model=FinancialMetricsOut)
def get_business_financial_metrics(business_id: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    transactions = db.query(Transaction).filter(Transaction.business_id == business_id).all()
    metrics = compute_financial_metrics(transactions, currency=business.currency, is_sample=bool(business.is_sample))
    return metrics

@router.delete("/transactions", status_code=status.HTTP_204_NO_CONTENT)
def clear_transactions(business_id: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    db.query(Transaction).filter(Transaction.business_id == business_id).delete()
    db.commit()
    return None
