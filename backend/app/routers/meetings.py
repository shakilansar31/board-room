import json
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from backend.app.database import get_db, SessionLocal
from backend.app.models.entities import (
    Business,
    Document,
    Transaction,
    Meeting,
    MeetingMessage,
    Recommendation,
    Task
)
from backend.app.models.schemas import (
    MeetingCreate,
    MeetingOut,
    MeetingMessageOut,
    RecommendationOut,
    RecommendationStatusUpdate,
    TaskOut
)
from backend.app.services.calculator import compute_financial_metrics
from backend.app.services.gemini_orchestrator import orchestrator
from backend.app.services.pdf_generator import generate_meeting_pdf
from backend.app.services.guardrails import validate_input_guardrails
from backend.app.services.tavily_search import tavily_service

router = APIRouter(tags=["meetings"])

@router.post("/api/businesses/{business_id}/meetings", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_meeting(business_id: str, payload: MeetingCreate, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # 1. Enforce Prompt Injection & Business Scope Guardrails
    guard_result = validate_input_guardrails(payload.question)
    if not guard_result.is_safe:
        raise HTTPException(
            status_code=400,
            detail=guard_result.refusal_reason or "Question rejected by business guardrails."
        )

    # 2. Retrieve Live Tavily Search Market Intelligence & Benchmarks
    market_intelligence = tavily_service.search_strategy_intelligence(
        question=guard_result.sanitized_text,
        industry=business.industry or "Commercial Business",
        location=business.location or "India"
    )

    participants = payload.participants or ["ceo", "cfo", "cmo", "coo", "cto"]
    meeting = Meeting(
        business_id=business_id,
        question=guard_result.sanitized_text,
        status="created",
        participants_json=json.dumps(participants),
        market_research_json=json.dumps(market_intelligence),
        started_at=datetime.now(timezone.utc)
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

@router.get("/api/businesses/{business_id}/meetings", response_model=List[MeetingOut])
def list_business_meetings(business_id: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    return (
        db.query(Meeting)
        .filter(Meeting.business_id == business_id)
        .order_by(Meeting.started_at.desc())
        .all()
    )

@router.get("/api/meetings/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.post("/api/meetings/{meeting_id}/cancel")
def cancel_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status in ("completed", "failed"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel meeting in status '{meeting.status}'")

    meeting.status = "canceled"
    meeting.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Meeting canceled successfully", "status": "canceled"}

@router.get("/api/meetings/{meeting_id}/events")
async def stream_meeting_events(meeting_id: str):
    """
    SSE endpoint for streaming meeting progress and agent contributions.
    Idempotent:
    - If already completed or failed, sends historical messages and complete event.
    - If 'created', transitions to 'running', streams pipeline, and persists all messages & tasks.
    """
    async def event_generator():
        # Open independent DB session for streaming
        db = SessionLocal()
        try:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if not meeting:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": "Meeting not found"})
                }
                return

            # If already completed or canceled, stream historical transcript and finish
            if meeting.status in ("completed", "canceled", "failed"):
                if meeting.market_research_json:
                    yield {
                        "event": "market_research",
                        "data": meeting.market_research_json
                    }
                messages = db.query(MeetingMessage).filter(MeetingMessage.meeting_id == meeting_id).order_by(MeetingMessage.created_at).all()
                for msg in messages:
                    yield {
                        "event": "message",
                        "data": json.dumps({
                            "executive": msg.executive,
                            "stage": msg.stage,
                            "content": msg.content,
                            "evidence_refs": json.loads(msg.evidence_refs_json or "[]"),
                            "assumptions": json.loads(msg.assumptions_json or "[]"),
                            "risks": json.loads(msg.risks_json or "[]"),
                            "dissent": json.loads(msg.dissent_json or "[]"),
                            "is_historical": True
                        })
                    }
                yield {
                    "event": "complete",
                    "data": json.dumps({
                        "status": meeting.status,
                        "synthesis": json.loads(meeting.synthesis_json or "{}"),
                        "model_used": meeting.model_used,
                        "token_usage": json.loads(meeting.token_usage_json or "{}"),
                        "is_historical": True
                    })
                }
                return

            # Mark meeting as running
            meeting.status = "running"
            db.commit()

            business = db.query(Business).filter(Business.id == meeting.business_id).first()
            business_dict = {
                "id": business.id,
                "name": business.name,
                "industry": business.industry,
                "location": business.location,
                "currency": business.currency,
                "description": business.description,
                "goals": business.goals,
                "constraints": business.constraints,
                "is_sample": bool(business.is_sample)
            }

            transactions = db.query(Transaction).filter(Transaction.business_id == business.id).all()
            metrics = compute_financial_metrics(transactions, currency=business.currency, is_sample=bool(business.is_sample))

            docs = db.query(Document).filter(Document.business_id == business.id).all()
            docs_list = [
                {
                    "id": d.id,
                    "filename": d.filename,
                    "original_name": d.original_name,
                    "extracted_text": d.extracted_text,
                    "page_count": d.page_count
                }
                for d in docs
            ]

            selected_participants = json.loads(meeting.participants_json or "[]")

            # Load Tavily market research
            market_data = json.loads(meeting.market_research_json or "{}")

            # Stream execution generator
            async for step in orchestrator.run_boardroom_meeting_stream(
                business=business_dict,
                metrics=metrics,
                documents=docs_list,
                question=meeting.question,
                selected_participants=selected_participants,
                market_research=market_data
            ):
                event_type = step["event"]
                event_data = step["data"]

                # Check if canceled mid-flight
                db.refresh(meeting)
                if meeting.status == "canceled":
                    yield {
                        "event": "error",
                        "data": json.dumps({"error": "Meeting was canceled by user."})
                    }
                    return

                # Persist message if it's a contribution
                if event_type == "message":
                    msg = MeetingMessage(
                        meeting_id=meeting.id,
                        executive=event_data["executive"],
                        stage=event_data["stage"],
                        content=event_data["content"],
                        evidence_refs_json=json.dumps(event_data.get("evidence_refs", [])),
                        assumptions_json=json.dumps(event_data.get("assumptions", [])),
                        risks_json=json.dumps(event_data.get("risks", [])),
                        dissent_json=json.dumps(event_data.get("dissent", []))
                    )
                    db.add(msg)
                    db.commit()

                elif event_type == "complete":
                    synthesis = event_data.get("synthesis", {})
                    meeting.synthesis_json = json.dumps(synthesis)
                    meeting.status = "completed"
                    meeting.completed_at = datetime.now(timezone.utc)
                    meeting.model_used = event_data.get("model_used")
                    meeting.token_usage_json = json.dumps(event_data.get("token_usage", {}))

                    # Persist Primary Recommendation
                    rec_title = synthesis.get("final_recommendation", "Boardroom Recommendation")[:250]
                    recommendation = Recommendation(
                        meeting_id=meeting.id,
                        business_id=business.id,
                        title=rec_title,
                        rationale=synthesis.get("justification", ""),
                        risks="; ".join(synthesis.get("preserved_minority_dissent", [])),
                        status="proposed",
                        priority="high"
                    )
                    db.add(recommendation)

                    # Persist Prioritized Actionable Tasks
                    tasks = synthesis.get("priority_tasks", [])
                    for t in tasks:
                        task_item = Task(
                            business_id=business.id,
                            meeting_id=meeting.id,
                            title=t.get("title", "Action Item")[:250],
                            description=t.get("description", ""),
                            priority=(t.get("priority") or "medium").lower(),
                            owner=t.get("recommended_owner", "Unassigned"),
                            due_date=t.get("estimated_timeline", ""),
                            success_metric=t.get("measurable_kpi", ""),
                            status="todo"
                        )
                        db.add(task_item)

                    db.commit()

                # Yield SSE message
                yield {
                    "event": event_type,
                    "data": json.dumps(event_data)
                }

        except Exception as e:
            logger.error(f"Error in meeting stream: {e}", exc_info=True)
            db.rollback()
            try:
                meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
                if meeting and meeting.status != "completed":
                    meeting.status = "failed"
                    meeting.error = str(e)
                    meeting.completed_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception:
                pass
            yield {
                "event": "error",
                "data": json.dumps({"error": f"Meeting execution failed: {str(e)}"})
            }
        finally:
            db.close()

    return EventSourceResponse(event_generator())

@router.get("/api/meetings/{meeting_id}/report.pdf")
def export_meeting_pdf(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    business = db.query(Business).filter(Business.id == meeting.business_id).first()
    messages = db.query(MeetingMessage).filter(MeetingMessage.meeting_id == meeting_id).order_by(MeetingMessage.created_at).all()
    recommendations = db.query(Recommendation).filter(Recommendation.meeting_id == meeting_id).all()
    tasks = db.query(Task).filter(Task.meeting_id == meeting_id).all()
    
    transactions = db.query(Transaction).filter(Transaction.business_id == business.id).all()
    metrics = compute_financial_metrics(transactions, currency=business.currency, is_sample=bool(business.is_sample))

    pdf_bytes = generate_meeting_pdf(
        meeting=meeting,
        business=business,
        messages=messages,
        recommendations=recommendations,
        tasks=tasks,
        metrics=metrics
    )

    filename = f"Boardroom_Report_{business.name.replace(' ', '_')}_{meeting.id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )

@router.post("/api/meetings/{meeting_id}/recommendations/{rec_id}", response_model=RecommendationOut)
def update_recommendation_status(
    meeting_id: str,
    rec_id: str,
    payload: RecommendationStatusUpdate,
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id, Recommendation.meeting_id == meeting_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if payload.status not in ("proposed", "accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be proposed, accepted, or rejected.")

    rec.status = payload.status
    db.commit()
    db.refresh(rec)
    return rec

@router.post("/api/meetings/{meeting_id}/follow-up", response_model=MeetingOut)
def follow_up_meeting(
    meeting_id: str,
    payload: MeetingCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a new follow-up meeting referencing the previous meeting's context
    within the same workspace, preventing cross-workspace leakage.
    """
    prev_meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not prev_meeting:
        raise HTTPException(status_code=404, detail="Previous meeting not found")

    enhanced_question = f"[Follow-up to Meeting '{prev_meeting.question}']: {payload.question}"
    participants = payload.participants or json.loads(prev_meeting.participants_json or '["ceo", "cfo", "cmo", "coo", "cto"]')

    new_meeting = Meeting(
        business_id=prev_meeting.business_id,
        question=enhanced_question,
        status="created",
        participants_json=json.dumps(participants),
        started_at=datetime.now(timezone.utc)
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    return new_meeting
