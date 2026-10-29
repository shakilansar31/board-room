from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

# Business schemas
class BusinessBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: str = Field(..., min_length=1, max_length=100)
    location: Optional[str] = ""
    currency: str = Field(default="INR", max_length=10)
    description: str = Field(..., min_length=1)
    goals: Optional[str] = ""
    constraints: Optional[str] = ""

class BusinessCreate(BusinessBase):
    is_sample: Optional[bool] = False

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    goals: Optional[str] = None
    constraints: Optional[str] = None

class BusinessOut(BusinessBase):
    id: str
    is_sample: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Document schemas
class DocumentOut(BaseModel):
    id: str
    business_id: str
    filename: str
    original_name: str
    mime_type: str
    page_count: int
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Transaction schemas
class TransactionCreate(BaseModel):
    date: str
    kind: str # revenue or expense
    category: str
    amount: float
    currency: Optional[str] = "INR"
    description: Optional[str] = ""
    source_id: Optional[str] = None

class TransactionOut(BaseModel):
    id: str
    business_id: str
    date: str
    kind: str
    category: str
    amount: float
    currency: str
    description: Optional[str]
    source_id: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ColumnMapping(BaseModel):
    date_col: str
    kind_col: Optional[str] = None
    category_col: str
    amount_col: str
    description_col: Optional[str] = None
    default_kind: Optional[str] = "expense" # if kind column not present

class TransactionImportPreviewRequest(BaseModel):
    mapping: ColumnMapping

class TransactionImportRequest(BaseModel):
    mapping: ColumnMapping

class TransactionImportResponse(BaseModel):
    imported_count: int
    skipped_count: int
    total_processed: int
    errors: List[str] = []

# Financial Metrics schemas
class MonthlyMetric(BaseModel):
    month: str # YYYY-MM
    revenue: float
    expense: float
    operating_result: float
    margin_percent: Optional[float] = None

class CategoryBreakdown(BaseModel):
    category: str
    kind: str
    total_amount: float
    percentage_of_total: float

class FinancialMetricsOut(BaseModel):
    currency: str
    total_revenue: float
    total_expenses: float
    net_operating_result: float
    operating_margin_percent: Optional[float] = None
    coverage_start: Optional[str] = None
    coverage_end: Optional[str] = None
    total_transactions: int
    monthly_trend: List[MonthlyMetric] = []
    category_breakdown: List[CategoryBreakdown] = []
    mom_revenue_growth_percent: Optional[float] = None
    mom_expense_growth_percent: Optional[float] = None
    accounting_limitations: List[str] = []
    is_sample_data: bool = False

# Executive Structured Output Schemas (for Gemini Structured Outputs)
class EvidenceCitation(BaseModel):
    source_id: str
    description: str
    data_point: str

class ExecutiveAnalysis(BaseModel):
    executive: str # ceo, cfo, cmo, coo, cto
    role_title: str
    stance_summary: str
    detailed_analysis: str
    key_findings: List[str]
    evidence_citations: List[EvidenceCitation] = []
    explicit_assumptions: List[str] = []
    identified_risks: List[str] = []
    confidence_level: str # High, Moderate, Low (with rationale)
    confidence_rationale: str
    requires_more_data: bool = False
    missing_data_requests: List[str] = []

class CritiquePoint(BaseModel):
    target_executive: str
    point_of_disagreement: str
    counter_evidence_or_logic: str
    risk_highlighted: str

class ExecutiveCritique(BaseModel):
    executive: str
    role_title: str
    critique_points: List[CritiquePoint] = []
    defense_or_refinement: str
    unresolved_concerns: List[str] = []

class PrioritizedTaskItem(BaseModel):
    title: str
    description: str
    priority: str # High, Medium, Low
    recommended_owner: str # e.g., Operations Lead, Head of Finance, Marketing Manager
    estimated_timeline: str
    measurable_kpi: str

class CeoSynthesis(BaseModel):
    executive: str = "ceo"
    role_title: str = "Chief Executive Officer / Chief of Staff"
    problem_clarification: str
    evidence_summary: str
    specialist_perspectives_summary: str
    core_disagreements_debated: List[str]
    options_considered: List[Dict[str, str]] # e.g. [{"name": "Option A", "pros": "...", "cons": "..."}]
    final_recommendation: str
    justification: str
    preserved_minority_dissent: List[str]
    known_limitations_and_uncertainties: List[str]
    priority_tasks: List[PrioritizedTaskItem] = []
    confidence_statement: str

# Meeting schemas
class MeetingCreate(BaseModel):
    question: str = Field(..., min_length=3)
    participants: Optional[List[str]] = None # defaults to all 5 or auto-selected by CEO

class MeetingMessageOut(BaseModel):
    id: str
    meeting_id: str
    executive: str
    stage: str
    content: str
    evidence_refs_json: Optional[str]
    assumptions_json: Optional[str]
    risks_json: Optional[str]
    dissent_json: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RecommendationOut(BaseModel):
    id: str
    meeting_id: str
    business_id: str
    title: str
    rationale: str
    risks: Optional[str]
    status: str
    priority: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RecommendationStatusUpdate(BaseModel):
    status: str # proposed, accepted, rejected

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = ""
    priority: str = Field(default="medium")
    owner: Optional[str] = "Unassigned"
    due_date: Optional[str] = ""
    success_metric: Optional[str] = ""
    status: Optional[str] = "todo"
    meeting_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[str] = None
    success_metric: Optional[str] = None
    status: Optional[str] = None

class TaskOut(BaseModel):
    id: str
    business_id: str
    meeting_id: Optional[str]
    title: str
    description: Optional[str]
    priority: str
    owner: Optional[str]
    due_date: Optional[str]
    success_metric: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MeetingOut(BaseModel):
    id: str
    business_id: str
    question: str
    status: str
    participants_json: str
    started_at: datetime
    completed_at: Optional[datetime]
    error: Optional[str]
    model_used: Optional[str]
    token_usage_json: Optional[str]
    synthesis_json: Optional[str]
    market_research_json: Optional[str] = "{}"
    messages: List[MeetingMessageOut] = []
    recommendations: List[RecommendationOut] = []
    tasks: List[TaskOut] = []
    model_config = ConfigDict(from_attributes=True)
