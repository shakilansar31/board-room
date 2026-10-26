import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.entities import Business, Transaction, Document, Task
from backend.app.models.schemas import BusinessCreate, BusinessUpdate, BusinessOut

router = APIRouter(prefix="/api/businesses", tags=["businesses"])

@router.post("", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db)):
    business = Business(
        name=payload.name.strip(),
        industry=payload.industry.strip(),
        location=payload.location.strip() if payload.location else "",
        currency=payload.currency.strip().upper(),
        description=payload.description.strip(),
        goals=payload.goals.strip() if payload.goals else "",
        constraints=payload.constraints.strip() if payload.constraints else "",
        is_sample=1 if payload.is_sample else 0
    )
    db.add(business)
    db.commit()
    db.refresh(business)
    return business

@router.get("", response_model=List[BusinessOut])
def list_businesses(db: Session = Depends(get_db)):
    return db.query(Business).order_by(Business.created_at.desc()).all()

@router.get("/{business_id}", response_model=BusinessOut)
def get_business(business_id: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@router.patch("/{business_id}", response_model=BusinessOut)
def update_business(business_id: str, payload: BusinessUpdate, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if field == "currency":
                setattr(business, field, value.strip().upper())
            elif isinstance(value, str):
                setattr(business, field, value.strip())
            else:
                setattr(business, field, value)

    db.commit()
    db.refresh(business)
    return business

@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business(business_id: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    db.delete(business)
    db.commit()
    return None
