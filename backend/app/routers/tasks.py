from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.entities import Business, Task
from backend.app.models.schemas import TaskCreate, TaskUpdate, TaskOut

router = APIRouter(tags=["tasks"])

@router.get("/api/businesses/{business_id}/tasks", response_model=List[TaskOut])
def list_business_tasks(
    business_id: str,
    status_filter: str = None,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    query = db.query(Task).filter(Task.business_id == business_id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    return query.order_by(Task.created_at.desc()).all()

@router.post("/api/businesses/{business_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    business_id: str,
    payload: TaskCreate,
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    task = Task(
        business_id=business_id,
        meeting_id=payload.meeting_id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else "",
        priority=payload.priority.lower(),
        owner=payload.owner.strip() if payload.owner else "Unassigned",
        due_date=payload.due_date.strip() if payload.due_date else "",
        success_metric=payload.success_metric.strip() if payload.success_metric else "",
        status=payload.status or "todo"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            if field == "status" and val not in ("todo", "in_progress", "done"):
                raise HTTPException(status_code=400, detail="Invalid status. Must be todo, in_progress, or done.")
            setattr(task, field, val)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None
