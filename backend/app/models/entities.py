import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Business(Base):
    __tablename__ = "businesses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True, default="")
    currency = Column(String(10), nullable=False, default="INR")
    description = Column(Text, nullable=False, default="")
    goals = Column(Text, nullable=True, default="")
    constraints = Column(Text, nullable=True, default="")
    is_sample = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    documents = relationship("Document", back_populates="business", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="business", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="business", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="business", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="business", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    storage_path = Column(Text, nullable=False)
    extracted_text = Column(Text, nullable=True, default="")
    page_count = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="ready") # pending, ready, error
    metadata_json = Column(Text, nullable=True, default="{}")
    created_at = Column(DateTime, default=utc_now)

    business = relationship("Business", back_populates="documents")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(20), nullable=False) # ISO YYYY-MM-DD
    kind = Column(String(20), nullable=False) # revenue or expense
    category = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    description = Column(Text, nullable=True, default="")
    source_id = Column(String(36), nullable=True) # document ID if imported from document
    created_at = Column(DateTime, default=utc_now)

    business = relationship("Business", back_populates="transactions")

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="created") # created, running, completed, failed, canceled
    participants_json = Column(Text, nullable=False, default='["ceo", "cfo", "cmo", "coo", "cto"]')
    started_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    model_used = Column(String(100), nullable=True)
    token_usage_json = Column(Text, nullable=True, default="{}")
    synthesis_json = Column(Text, nullable=True, default="{}")

    business = relationship("Business", back_populates="meetings")
    messages = relationship("MeetingMessage", back_populates="meeting", cascade="all, delete-orphan", order_by="MeetingMessage.created_at")
    recommendations = relationship("Recommendation", back_populates="meeting", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="meeting")

class MeetingMessage(Base):
    __tablename__ = "meeting_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    executive = Column(String(50), nullable=False) # ceo, cfo, cmo, coo, cto
    stage = Column(String(50), nullable=False) # clarification, specialist_analysis, critique_rebuttal, ceo_synthesis, final_recommendation
    content = Column(Text, nullable=False)
    evidence_refs_json = Column(Text, nullable=True, default="[]")
    assumptions_json = Column(Text, nullable=True, default="[]")
    risks_json = Column(Text, nullable=True, default="[]")
    dissent_json = Column(Text, nullable=True, default="[]")
    created_at = Column(DateTime, default=utc_now)

    meeting = relationship("Meeting", back_populates="messages")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    rationale = Column(Text, nullable=False)
    risks = Column(Text, nullable=True, default="")
    status = Column(String(50), nullable=False, default="proposed") # proposed, accepted, rejected
    priority = Column(String(20), nullable=False, default="medium") # high, medium, low
    created_at = Column(DateTime, default=utc_now)

    meeting = relationship("Meeting", back_populates="recommendations")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True, default="")
    priority = Column(String(20), nullable=False, default="medium") # high, medium, low
    owner = Column(String(100), nullable=True, default="Unassigned")
    due_date = Column(String(50), nullable=True, default="")
    success_metric = Column(Text, nullable=True, default="")
    status = Column(String(50), nullable=False, default="todo") # todo, in_progress, done
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    business = relationship("Business", back_populates="tasks")
    meeting = relationship("Meeting", back_populates="tasks")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(100), nullable=False)
    actor = Column(String(100), nullable=False, default="system")
    payload_json = Column(Text, nullable=True, default="{}")
    created_at = Column(DateTime, default=utc_now)

    business = relationship("Business", back_populates="audit_events")
