import asyncio
import json
import logging
import time
from typing import List, Dict, Any, Optional, AsyncGenerator
from google import genai
from google.genai import types

from backend.app.config import settings
from backend.app.models.schemas import (
    ExecutiveAnalysis,
    ExecutiveCritique,
    CeoSynthesis,
    FinancialMetricsOut
)

logger = logging.getLogger(__name__)

# Executive System Prompts
EXECUTIVE_SYSTEM_PROMPTS = {
    "ceo": """You are the Chief Executive Officer (CEO) and Chief of Staff of the virtual executive boardroom.
Your role: Classify the business problem, set a rigorous agenda, select relevant executive specialists, moderate substantive disagreements, and synthesize a decisive, evidence-backed final recommendation.
Crucial constraints:
- Never silently override factual uncertainty.
- You must preserve minority dissent and known risks rather than forcing false consensus.
- Base your statements on the provided evidence packet (financial metrics, document citations, company context). Clearly label any non-grounded claim as an explicit assumption.
- Format all outputs strictly conforming to the requested JSON schema.""",

    "cfo": """You are the Chief Financial Officer (CFO) of the virtual executive boardroom.
Your role: Provide rigorous financial analysis, revenue and expense breakdown, margin trends, cash-flow caveats, capital allocation prudence, and financial risk assessment.
Crucial constraints:
- Use the deterministic calculations provided in the evidence packet. Do NOT invent transactions, margins, or growth rates.
- Do not label operating results as 'Net Profit' if taxes, financing, or overhead costs are unrecorded.
- Cite specific metrics and numbers from the evidence packet. Clearly label projections as assumptions.
- Format all outputs strictly conforming to the requested JSON schema.""",

    "cmo": """You are the Chief Marketing Officer (CMO) of the virtual executive boardroom.
Your role: Provide customer acquisition, demand generation, market positioning, brand differentiation, channel economics (CAC/LTV), and pricing strategy analysis.
Crucial constraints:
- Do not invent marketing attribution or channel conversion rates that are not present in the evidence.
- Clearly separate verified historical metrics from marketing assumptions.
- Balance growth ambition with acquisition payback discipline.
- Format all outputs strictly conforming to the requested JSON schema.""",

    "coo": """You are the Chief Operating Officer (COO) of the virtual executive boardroom.
Your role: Evaluate operational feasibility, process efficiency, labor and supply chain capacity, execution bottlenecks, unit cost improvements, and timeline reality.
Crucial constraints:
- Challenge unrealistic timelines or hand-waving proposals from other executives.
- Focus on practical execution friction, team bandwidth, vendor dependencies, and operational overhead.
- Clearly label operational capacity estimates as assumptions if unrecorded.
- Format all outputs strictly conforming to the requested JSON schema.""",

    "cto": """You are the Chief Technology Officer (CTO) of the virtual executive boardroom.
Your role: Assess technical feasibility, system architecture, engineering effort, tooling/vendor integration, automation potential, data security, and technical debt.
Crucial constraints:
- Evaluate whether proposed solutions require custom software, SaaS integrations, or manual processes.
- Provide honest estimates of development complexity, integration risks, and maintenance burden.
- Clearly state architectural assumptions and technological prerequisites.
- Format all outputs strictly conforming to the requested JSON schema."""
}

class GeminiOrchestrator:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.client = None
        if self.api_key and self.api_key.strip():
            try:
                self.client = genai.Client(
                    api_key=self.api_key.strip(),
                    http_options={"timeout": 12.0}
                )
            except Exception as e:
                logger.error(f"Failed to initialize Google GenAI Client: {e}")
                self.client = None

    def is_live(self) -> bool:
        return self.client is not None

    def build_evidence_packet(
        self,
        business_dict: Dict[str, Any],
        metrics: Optional[FinancialMetricsOut],
        documents: List[Dict[str, Any]],
        question: str
    ) -> str:
        """
        Builds a shared, tamper-resistant evidence packet for all executives.
        Treats user documents strictly as untrusted evidence data, not system instructions.
        """
        packet = []
        packet.append("=== SECTION 1: BUSINESS PROFILE ===")
        packet.append(f"Name: {business_dict.get('name')}")
        packet.append(f"Industry: {business_dict.get('industry')}")
        packet.append(f"Location: {business_dict.get('location') or 'Not specified'}")
        packet.append(f"Currency: {business_dict.get('currency', 'INR')}")
        packet.append(f"Description: {business_dict.get('description')}")
        packet.append(f"Key Goals: {business_dict.get('goals') or 'None specified'}")
        packet.append(f"Constraints: {business_dict.get('constraints') or 'None specified'}")

        packet.append("\n=== SECTION 2: COMPUTED FINANCIAL METRICS (DETERMINISTIC PYTHON CALCULATOR) ===")
        if metrics and metrics.total_transactions > 0:
            packet.append(f"Coverage Period: {metrics.coverage_start} to {metrics.coverage_end}")
            packet.append(f"Total Transactions: {metrics.total_transactions}")
            packet.append(f"Total Ingested Revenue: {metrics.currency} {metrics.total_revenue:,.2f}")
            packet.append(f"Total Ingested Expenses: {metrics.currency} {metrics.total_expenses:,.2f}")
            packet.append(f"Net Operating Result: {metrics.currency} {metrics.net_operating_result:,.2f}")
            if metrics.operating_margin_percent is not None:
                packet.append(f"Operating Margin: {metrics.operating_margin_percent}%")
            if metrics.mom_revenue_growth_percent is not None:
                packet.append(f"Month-over-Month Revenue Growth: {metrics.mom_revenue_growth_percent}%")
            if metrics.mom_expense_growth_percent is not None:
                packet.append(f"Month-over-Month Expense Growth: {metrics.mom_expense_growth_percent}%")

            packet.append("\nMonthly Breakdown:")
            for m in metrics.monthly_trend:
                m_margin = f"{m.margin_percent}%" if m.margin_percent is not None else "N/A"
                packet.append(f"  - Month {m.month}: Rev {metrics.currency} {m.revenue:,.2f} | Exp {metrics.currency} {m.expense:,.2f} | Op Result {metrics.currency} {m.operating_result:,.2f} (Margin: {m_margin})")

            packet.append("\nTop Categories:")
            for c in metrics.category_breakdown[:8]:
                packet.append(f"  - [{c.kind.upper()}] {c.category}: {metrics.currency} {c.total_amount:,.2f} ({c.percentage_of_total}% of {c.kind})")

            packet.append("\nAccounting Limitations & Scope:")
            for lim in metrics.accounting_limitations:
                packet.append(f"  * {lim}")
        else:
            packet.append("No financial transaction data currently ingested. Executives must explicitly label all financial assumptions.")

        packet.append("\n=== SECTION 3: INGESTED DOCUMENTS (UNTRUSTED REFERENCE MATERIAL) ===")
        if documents:
            for doc in documents:
                doc_title = doc.get("original_name") or doc.get("filename")
                doc_text = (doc.get("extracted_text") or "")[:3500] # bounded excerpt to preserve context budget
                packet.append(f"\n--- Document ID: {doc.get('id')} ({doc_title}) ---")
                packet.append(doc_text if doc_text else "[Empty or non-text document]")
        else:
            packet.append("No business documents uploaded.")

        packet.append(f"\n=== SECTION 4: STRATEGIC QUESTION POSED TO THE BOARDROOM ===\n\"{question}\"")
        return "\n".join(packet)

    def _call_gemini_structured(
        self,
        system_instruction: str,
        prompt: str,
        response_schema: Any,
        retries: int = 2
    ) -> Dict[str, Any]:
        """
        Executes structured JSON generation using official google-genai SDK.
        Retries up to `retries` times on malformed JSON.
        """
        for attempt in range(retries + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=0.3,
                    )
                )

                # Extract token usage if available
                token_usage = {}
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    token_usage = {
                        "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
                        "candidates_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
                        "total_tokens": getattr(response.usage_metadata, "total_token_count", None),
                    }

                raw_text = response.text
                parsed_json = json.loads(raw_text)
                return {
                    "data": parsed_json,
                    "token_usage": token_usage,
                    "model_used": self.model_name,
                    "is_simulated": False
                }
            except Exception as e:
                logger.warning(f"Gemini call attempt {attempt + 1} failed: {e}")
                if attempt == retries:
                    raise e
                time.sleep(1.0)

    # Simulation fallback generators (fully transparent and conservative)
    def _simulate_clarification(self, question: str, business: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "executive": "ceo",
            "role_title": "Chief Executive Officer / Chief of Staff",
            "agenda": f"Agenda: Evaluating strategic question for {business.get('name')}: '{question}'",
            "clarification": f"We are convening the executive committee to evaluate '{question}'. We will review historical revenue/expense data, customer acquisition feasibility, operational bandwidth, and technical integration requirements before deciding on an execution roadmap.",
            "selected_executives": ["ceo", "cfo", "cmo", "coo", "cto"],
            "is_simulated": True
        }

    def _simulate_analysis(self, executive: str, question: str, business: Dict[str, Any], metrics: Optional[FinancialMetricsOut]) -> Dict[str, Any]:
        curr = "₹" if business.get("currency") in ("INR", None) else business.get("currency")
        has_metrics = metrics and metrics.total_transactions > 0
        rev = metrics.total_revenue if has_metrics else 0
        exp = metrics.total_expenses if has_metrics else 0
        net = metrics.net_operating_result if has_metrics else 0
        margin = metrics.operating_margin_percent if has_metrics else 0

        simulations = {
            "cfo": {
                "role_title": "Chief Financial Officer",
                "stance_summary": f"Financial assessment requires strict cost discipline given current net operating result of {curr} {net:,.2f}.",
                "detailed_analysis": f"Based on the ingested figures, total revenue stands at {curr} {rev:,.2f} against expenses of {curr} {exp:,.2f}, resulting in an operating margin of {margin}%. We must maintain a minimum 3-month cash buffer and stress-test any new expenditure against downside revenue scenarios. If expanding or launching new initiatives, customer acquisition cost must have a validated payback period of under 6 months.",
                "key_findings": [
                    f"Operating result is {curr} {net:,.2f} across {metrics.total_transactions if has_metrics else 0} recorded transactions.",
                    "Any proposed expansion or campaign must specify strict payback periods.",
                    "Unrecorded tax, debt service, and working capital delays represent risk factors."
                ],
                "evidence_citations": [
                    {"source_id": "CALCULATOR_METRICS", "description": "Computed Financial Summary", "data_point": f"Revenue: {curr} {rev:,.2f}, Expenses: {curr} {exp:,.2f}"}
                ] if has_metrics else [],
                "explicit_assumptions": [
                    "Assuming unrecorded overheads (such as legal or software subscriptions) do not exceed 10% of total expenses.",
                    "Assuming collection terms on receivables average 30 days."
                ],
                "identified_risks": [
                    "Cash runway compression if initial returns are delayed.",
                    "Over-committing to fixed expenses before demand validation."
                ],
                "confidence_level": "Moderate (Data-grounded)",
                "confidence_rationale": "Grounded in recorded ledger transactions, though working capital timing remains unverified.",
                "requires_more_data": not has_metrics,
                "missing_data_requests": ["Detailed monthly cash balance records", "Contractual payment obligations"] if not has_metrics else []
            },
            "cmo": {
                "role_title": "Chief Marketing Officer",
                "stance_summary": "Positioning must emphasize distinct customer value while strictly containing customer acquisition cost.",
                "detailed_analysis": f"Addressing '{question}' requires clear customer segmentation. Rather than broad top-of-funnel ad spend which risks rapid cash burn, we should prioritize targeted outbound, organic content partnerships, and high-converting retargeting. If this involves new offerings or expansion, initial positioning should target high-intent existing audiences before opening speculative channels.",
                "key_findings": [
                    "Blended marketing spend must remain tied to measurable customer acquisition thresholds.",
                    "High customer retention and referral loops will outperform brute-force paid media.",
                    "Clear value proposition must be verified with at least 15 customer interviews."
                ],
                "evidence_citations": [],
                "explicit_assumptions": [
                    "Assuming target customer conversion rate of 2.5% to 3.5% on qualified landing pages.",
                    "Assuming an estimated customer payback window of 4 to 6 months."
                ],
                "identified_risks": [
                    "Rising customer acquisition costs on paid ad platforms.",
                    "Brand messaging dilution if targeting multiple disparate buyer personas simultaneously."
                ],
                "confidence_level": "Moderate (Qualitative)",
                "confidence_rationale": "Industry-standard acquisition dynamics applied to the company profile.",
                "requires_more_data": True,
                "missing_data_requests": ["Historical channel conversion metrics", "Customer churn/retention data"]
            },
            "coo": {
                "role_title": "Chief Operating Officer",
                "stance_summary": "Operational capacity and workflow efficiency must be preserved before taking on execution load.",
                "detailed_analysis": f"Executing on '{question}' will place stress on our existing team and delivery bandwidth. We must avoid taking on commitments that degrade quality of service for existing customers. We need standard operating procedures (SOPs), clear vendor SLAs, and milestone-gated check-ins. Scaling operations prematurely before workflows are standardized leads to margin erosion.",
                "key_findings": [
                    "Current operational headcount will face capacity bottlenecks if execution is rushed.",
                    "Process documentation and automation of repetitive tasks should precede volume scaling.",
                    "Supplier and fulfillment agreements must include flexible renegotiation clauses."
                ],
                "evidence_citations": [],
                "explicit_assumptions": [
                    "Assuming current operational team is operating at approximately 75-80% capacity utilization.",
                    "Assuming vendor onboarding takes 3-4 weeks."
                ],
                "identified_risks": [
                    "Delivery delays impacting customer satisfaction ratings.",
                    "Team burnout and error rates increasing during initial rollout."
                ],
                "confidence_level": "Moderate (Operational review)",
                "confidence_rationale": "Evaluated against execution bandwidth and operational dependencies.",
                "requires_more_data": False,
                "missing_data_requests": []
            },
            "cto": {
                "role_title": "Chief Technology Officer",
                "stance_summary": "Technical implementation should leverage proven off-the-shelf tooling rather than custom builds.",
                "detailed_analysis": f"From a technology standpoint, responding to '{question}' requires assessing whether we need custom engineering or existing integrations. To minimize time-to-market and capital expense, we must use established APIs, workflow automation platforms, and robust data hygiene. Custom development should be strictly reserved for core proprietary value.",
                "key_findings": [
                    "Building custom software tools for non-core workflows is cost-prohibitive at this stage.",
                    "Integration between CRM, billing, and analytics can be achieved in 2-3 weeks using standard connectors.",
                    "Data security and automated backups must be audited prior to launch."
                ],
                "evidence_citations": [],
                "explicit_assumptions": [
                    "Assuming standard SaaS platforms provide required webhook and API capabilities.",
                    "Assuming no complex legacy code migration is required."
                ],
                "identified_risks": [
                    "API rate limits or third-party service deprecation.",
                    "Data fragmentation across unintegrated software tools."
                ],
                "confidence_level": "High (Feasibility assessment)",
                "confidence_rationale": "Tooling and integration pathways are well established.",
                "requires_more_data": False,
                "missing_data_requests": []
            }
        }
        data = simulations.get(executive, simulations["cfo"])
        data["executive"] = executive
        data["is_simulated"] = True
        return data

    def _simulate_critique(self, executive: str, all_analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        critiques = {
            "cfo": {
                "role_title": "Chief Financial Officer",
                "critique_points": [
                    {
                        "target_executive": "cmo",
                        "point_of_disagreement": "CMO's projected payback period of 4-6 months is overly optimistic without verified customer lifetime data.",
                        "counter_evidence_or_logic": "Customer acquisition volatility frequently stretches payback to 8-10 months, which would strain our working capital.",
                        "risk_highlighted": "Short-term cash depletion before revenue realization."
                    }
                ],
                "defense_or_refinement": "I maintain that expenditure must be released in tranches tied directly to proven milestone conversions.",
                "unresolved_concerns": ["Unverified CAC stability under higher spend levels."]
            },
            "cmo": {
                "role_title": "Chief Marketing Officer",
                "critique_points": [
                    {
                        "target_executive": "cfo",
                        "point_of_disagreement": "CFO's austerity cap on marketing will starve the top of the funnel and guarantee sub-scale failure.",
                        "counter_evidence_or_logic": "Without sufficient testing budget across at least two channels, we cannot determine true unit economics.",
                        "risk_highlighted": "Stagnant organic growth and inability to reach critical mass."
                    }
                ],
                "defense_or_refinement": "We agree to set hard stop-loss limits on any ad experiments exceeding 14 days without conversion.",
                "unresolved_concerns": ["Underfunded campaigns may fail to yield statistically significant data."]
            },
            "coo": {
                "role_title": "Chief Operating Officer",
                "critique_points": [
                    {
                        "target_executive": "cto",
                        "point_of_disagreement": "CTO assumes standard API integrations take 2 weeks; historical vendor response times usually double that estimate.",
                        "counter_evidence_or_logic": "Vendor credentialing and edge-case handling regularly introduce 10-15 business days of delay.",
                        "risk_highlighted": "Launch schedule slippage and blocked go-to-market teams."
                    }
                ],
                "defense_or_refinement": "We will build a two-week contingency buffer into the project master schedule.",
                "unresolved_concerns": ["Vendor SLA enforcement during off-peak hours."]
            },
            "cto": {
                "role_title": "Chief Technology Officer",
                "critique_points": [
                    {
                        "target_executive": "coo",
                        "point_of_disagreement": "COO's proposed manual workflow oversight creates friction that can be solved via automated triggers.",
                        "counter_evidence_or_logic": "Automating alerts and status syncs eliminates roughly 6 hours per week of manual tracking.",
                        "risk_highlighted": "Operational team becoming a manual data-entry bottleneck."
                    }
                ],
                "defense_or_refinement": "We will implement webhook-based status syncs to prevent manual data overhead.",
                "unresolved_concerns": ["Third-party webhook uptime during maintenance windows."]
            }
        }
        data = critiques.get(executive, critiques["cfo"])
        data["executive"] = executive
        data["is_simulated"] = True
        return data

    def _simulate_synthesis(self, question: str, business: Dict[str, Any], metrics: Optional[FinancialMetricsOut]) -> Dict[str, Any]:
        curr = "₹" if business.get("currency") in ("INR", None) else business.get("currency")
        return {
            "executive": "ceo",
            "role_title": "Chief Executive Officer / Chief of Staff",
            "problem_clarification": f"Strategic determination for {business.get('name')} addressing '{question}'.",
            "evidence_summary": f"Evaluated financial records (Revenue: {curr} {metrics.total_revenue:,.2f}, Expenses: {curr} {metrics.total_expenses:,.2f}), market channel unit economics, team operational bandwidth, and technical integration requirements." if metrics else "Evaluated qualitative business profile, operational capacity, and technical feasibility.",
            "specialist_perspectives_summary": "The CFO emphasized financial runway protection and strict payback criteria. The CMO advocated for targeted, milestone-based customer acquisition. The COO highlighted delivery bandwidth constraints and timeline buffers. The CTO identified low-code/off-the-shelf integration pathways.",
            "core_disagreements_debated": [
                "CFO vs. CMO: Speed of marketing capital deployment vs. cash preservation buffer.",
                "COO vs. CTO: Vendor onboarding realistic timeline (2 weeks vs. 4 weeks with buffer)."
            ],
            "options_considered": [
                {
                    "name": "Aggressive Immediate Rollout",
                    "pros": "Maximizes speed to market and potential market capture.",
                    "cons": "Severely elevates cash burn and strains operational delivery bandwidth."
                },
                {
                    "name": "Phase-Gated Phased Execution (Recommended)",
                    "pros": "Releases capital in validated tranches; limits downside risk while preserving upside.",
                    "cons": "Requires strict weekly governance and milestone verification."
                },
                {
                    "name": "Status Quo Deferral",
                    "pros": "Preserves existing cash balance without execution risk.",
                    "cons": "Surrenders competitive advantage and misses strategic market opportunity."
                }
            ],
            "final_recommendation": f"Adopt a Phased, Tranche-Gated Execution Plan for '{question}'. Proceed with initial Phase 1 customer validation and operational prep with a capped initial budget. Release follow-on investment only after verified milestone metrics are achieved.",
            "justification": "This synthesis directly reconciles the CFO's cash runway mandates with the CMO's growth goals and the COO's capacity constraints. It prevents premature capital lock-in while maintaining strategic momentum.",
            "preserved_minority_dissent": [
                "CFO Dissent: Recommends pausing all new fixed hires until operating result demonstrates 2 consecutive quarters of growth.",
                "CMO Concern: Cautioned that restrictive early budget caps may constrain multi-channel testing."
            ],
            "known_limitations_and_uncertainties": [
                "Tax and debt obligations are unrecorded in current ledger data.",
                "Long-term customer retention and repeat purchase rate cannot be verified from available records."
            ],
            "priority_tasks": [
                {
                    "title": "Establish Milestone Metric Scorecard & Budget Cap",
                    "description": "Define explicit hurdle rates for customer acquisition payback (< 6 months) and set strict monthly expense ceilings.",
                    "priority": "High",
                    "recommended_owner": "Finance Lead",
                    "estimated_timeline": "Week 1",
                    "measurable_kpi": "Documented financial model with approved expenditure limits."
                },
                {
                    "title": "Conduct Target Customer Validation Sprints",
                    "description": "Engage 15-20 target customer profiles to validate value proposition and price elasticity before scaling paid campaigns.",
                    "priority": "High",
                    "recommended_owner": "Marketing / Growth Lead",
                    "estimated_timeline": "Weeks 2-3",
                    "measurable_kpi": "Minimum 70% positive intent rating across target interviews."
                },
                {
                    "title": "Implement Off-the-Shelf Integration Architecture",
                    "description": "Configure SaaS integrations and webhook automations for lead tracking and order fulfillment without custom codebase overhead.",
                    "priority": "Medium",
                    "recommended_owner": "Technology / Systems Lead",
                    "estimated_timeline": "Weeks 3-4",
                    "measurable_kpi": "End-to-end transaction test successfully executed in sandbox."
                },
                {
                    "title": "Standardize Delivery SOPs and Capacity Buffer",
                    "description": "Draft standard operating procedures and lock in backup vendor SLAs to prevent delivery bottlenecks.",
                    "priority": "Medium",
                    "recommended_owner": "Operations Lead",
                    "estimated_timeline": "Weeks 2-4",
                    "measurable_kpi": "Delivery turnaround time capped within committed SLA targets."
                }
            ],
            "confidence_statement": "High strategic confidence in phased governance; Moderate factual confidence in market response until Phase 1 data is collected.",
            "is_simulated": True
        }

    async def run_boardroom_meeting_stream(
        self,
        business: Dict[str, Any],
        metrics: Optional[FinancialMetricsOut],
        documents: List[Dict[str, Any]],
        question: str,
        selected_participants: Optional[List[str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes the multi-round boardroom pipeline and streams SSE events to caller.
        Events format:
        {
            "event": "stage_start" | "message" | "critique" | "synthesis" | "complete" | "error",
            "data": {...}
        }
        """
        # Step 1: Clarification & Agenda
        yield {
            "event": "stage_start",
            "data": {
                "stage": "clarification",
                "stage_title": "Stage 1: Clarifying Problem & Evidence Audit",
                "description": "CEO is auditing available financial metrics, documents, and business context."
            }
        }

        evidence_packet = self.build_evidence_packet(business, metrics, documents, question)
        total_tokens = 0
        model_name = self.model_name if self.is_live() else "simulated-engine"

        # CEO Clarification Call
        if self.is_live():
            try:
                clarification_prompt = f"""Review the following evidence packet for the business and strategic question.
{evidence_packet}

Tasks:
1. Clarify the strategic problem in crisp executive terms.
2. Formulate an actionable agenda.
3. Confirm the participating specialists (CEO, CFO, CMO, COO, CTO) or select the relevant subset.

Respond strictly in JSON matching the requested schema:
{{
  "executive": "ceo",
  "role_title": "Chief Executive Officer / Chief of Staff",
  "agenda": "string",
  "clarification": "string",
  "selected_executives": ["ceo", "cfo", "cmo", "coo", "cto"]
}}"""
                ceo_clarify = await asyncio.to_thread(
                    self._call_gemini_structured,
                    system_instruction=EXECUTIVE_SYSTEM_PROMPTS["ceo"],
                    prompt=clarification_prompt,
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "executive": {"type": "STRING"},
                            "role_title": {"type": "STRING"},
                            "agenda": {"type": "STRING"},
                            "clarification": {"type": "STRING"},
                            "selected_executives": {"type": "ARRAY", "items": {"type": "STRING"}}
                        },
                        "required": ["executive", "role_title", "agenda", "clarification", "selected_executives"]
                    }
                )
                clarify_data = ceo_clarify["data"]
                if ceo_clarify.get("token_usage", {}).get("total_tokens"):
                    total_tokens += ceo_clarify["token_usage"]["total_tokens"]
            except Exception as e:
                logger.error(f"Live Gemini clarification failed: {e}. Falling back to simulation mode.")
                clarify_data = self._simulate_clarification(question, business)
        else:
            clarify_data = self._simulate_clarification(question, business)

        yield {
            "event": "message",
            "data": {
                "executive": "ceo",
                "stage": "clarification",
                "content": f"**Agenda:** {clarify_data.get('agenda')}\n\n**Clarification & Scope:** {clarify_data.get('clarification')}",
                "evidence_refs": [],
                "assumptions": [],
                "risks": [],
                "is_simulated": clarify_data.get("is_simulated", False)
            }
        }

        # Step 2: Specialist Analyses
        exec_list = selected_participants or clarify_data.get("selected_executives") or ["cfo", "cmo", "coo", "cto"]
        # Filter to specialist roles (exclude ceo for independent analysis)
        specialists = [e for e in exec_list if e != "ceo"]

        yield {
            "event": "stage_start",
            "data": {
                "stage": "specialist_analysis",
                "stage_title": "Stage 2: Independent Specialist Analyses",
                "description": f"Specialist executives ({', '.join(s.upper() for s in specialists)}) are reviewing evidence independently."
            }
        }

        specialist_results = []
        for spec in specialists:
            if self.is_live():
                try:
                    spec_prompt = f"""Review the following evidence packet and analyze the strategic question from your specific executive domain ({spec.upper()}).
{evidence_packet}

Remember:
- Cite specific metrics or document excerpts with source_id.
- Explicitly separate facts from assumptions.
- Identify real risks and state your confidence level with justification.
- If necessary data is missing, mark requires_more_data=true and list missing data items.

Respond strictly in JSON matching the ExecutiveAnalysis schema."""
                    spec_call = await asyncio.to_thread(
                        self._call_gemini_structured,
                        system_instruction=EXECUTIVE_SYSTEM_PROMPTS.get(spec, EXECUTIVE_SYSTEM_PROMPTS["ceo"]),
                        prompt=spec_prompt,
                        response_schema=ExecutiveAnalysis
                    )
                    analysis = spec_call["data"]
                    if spec_call.get("token_usage", {}).get("total_tokens"):
                        total_tokens += spec_call["token_usage"]["total_tokens"]
                except Exception as e:
                    logger.error(f"Live Gemini analysis for {spec} failed: {e}. Using simulation fallback.")
                    analysis = self._simulate_analysis(spec, question, business, metrics)
            else:
                analysis = self._simulate_analysis(spec, question, business, metrics)

            specialist_results.append(analysis)

            # Format contribution content
            formatted_analysis = f"### {analysis.get('stance_summary')}\n\n{analysis.get('detailed_analysis')}\n\n**Key Findings:**\n" + "\n".join(f"- {kf}" for kf in analysis.get('key_findings', []))
            if analysis.get('missing_data_requests'):
                formatted_analysis += "\n\n**Data Requests:**\n" + "\n".join(f"- {md}" for md in analysis.get('missing_data_requests', []))

            yield {
                "event": "message",
                "data": {
                    "executive": spec,
                    "stage": "specialist_analysis",
                    "content": formatted_analysis,
                    "evidence_refs": analysis.get("evidence_citations", []),
                    "assumptions": analysis.get("explicit_assumptions", []),
                    "risks": analysis.get("identified_risks", []),
                    "confidence": f"{analysis.get('confidence_level')} — {analysis.get('confidence_rationale')}",
                    "is_simulated": analysis.get("is_simulated", False)
                }
            }

        # Step 3: Substantive Critique & Rebuttal Round
        yield {
            "event": "stage_start",
            "data": {
                "stage": "critique_rebuttal",
                "stage_title": "Stage 3: Substantive Critique & Rebuttal Round",
                "description": "Executives are evaluating conflicting proposals, numerical claims, and timeline trade-offs."
            }
        }

        # Build cross-examination packet containing prior specialist analyses
        prior_analyses_summary = "\n\n".join([
            f"=== {a.get('executive', '').upper()} ({a.get('role_title', '')}) ===\nStance: {a.get('stance_summary')}\nAnalysis: {a.get('detailed_analysis')}\nRisks: {', '.join(a.get('identified_risks', []))}"
            for a in specialist_results
        ])

        critique_results = []
        for spec in specialists:
            if self.is_live():
                try:
                    critique_prompt = f"""You have received the initial analyses from all executive peers:
{prior_analyses_summary}

Original Evidence Packet:
{evidence_packet}

As the {spec.upper()}, critically examine your peers' claims:
1. Identify specific disagreements, unrealistic numerical claims, timeline friction, or understated risks.
2. Defend or refine your own stance in light of peer arguments.
3. Highlight any unresolved concerns that the CEO must address in the final decision.

Respond strictly in JSON matching the ExecutiveCritique schema."""
                    critique_call = await asyncio.to_thread(
                        self._call_gemini_structured,
                        system_instruction=EXECUTIVE_SYSTEM_PROMPTS.get(spec, EXECUTIVE_SYSTEM_PROMPTS["ceo"]),
                        prompt=critique_prompt,
                        response_schema=ExecutiveCritique
                    )
                    critique = critique_call["data"]
                    if critique_call.get("token_usage", {}).get("total_tokens"):
                        total_tokens += critique_call["token_usage"]["total_tokens"]
                except Exception as e:
                    logger.error(f"Live Gemini critique for {spec} failed: {e}. Using simulation fallback.")
                    critique = self._simulate_critique(spec, specialist_results)
            else:
                critique = self._simulate_critique(spec, specialist_results)

            critique_results.append(critique)

            # Format critique content
            pts_str = ""
            for pt in critique.get("critique_points", []):
                pts_str += f"- **Challenge to {pt.get('target_executive', '').upper()}:** {pt.get('point_of_disagreement')}\n  *Counter-logic:* {pt.get('counter_evidence_or_logic')}\n  *Risk flagged:* {pt.get('risk_highlighted')}\n\n"

            formatted_critique = f"{pts_str}**Stance Refinement:**\n{critique.get('defense_or_refinement')}"
            if critique.get("unresolved_concerns"):
                formatted_critique += "\n\n**Unresolved Concerns for CEO:**\n" + "\n".join(f"- {uc}" for uc in critique.get("unresolved_concerns", []))

            yield {
                "event": "message",
                "data": {
                    "executive": spec,
                    "stage": "critique_rebuttal",
                    "content": formatted_critique,
                    "evidence_refs": [],
                    "assumptions": [],
                    "risks": [pt.get("risk_highlighted") for pt in critique.get("critique_points", []) if pt.get("risk_highlighted")],
                    "dissent": critique.get("unresolved_concerns", []),
                    "is_simulated": critique.get("is_simulated", False)
                }
            }

        # Step 4: CEO Synthesis & Decision
        yield {
            "event": "stage_start",
            "data": {
                "stage": "ceo_synthesis",
                "stage_title": "Stage 4: CEO Synthesis & Consolidated Recommendation",
                "description": "CEO is weighing all arguments, preserving minority dissent, and finalizing the strategic action plan."
            }
        }

        all_debate_summary = f"""EVIDENCE PACKET:
{evidence_packet}

SPECIALIST ANALYSES:
{prior_analyses_summary}

CRITIQUE AND REBUTTAL ROUND:
""" + "\n\n".join([f"[{c.get('executive', '').upper()}]: {c.get('defense_or_refinement')} | Unresolved: {', '.join(c.get('unresolved_concerns', []))}" for c in critique_results])

        if self.is_live():
            try:
                ceo_synthesis_prompt = f"""Review the entire debate transcript and evidence packet:
{all_debate_summary}

As CEO, deliver the definitive executive synthesis:
1. Clarify the core problem and evidence summary.
2. Summarize key specialist insights and core disagreements debated.
3. Evaluate considered options (with pros and cons).
4. Issue a definitive final recommendation with clear justification.
5. PRESERVE minority dissent and unresolved risks (do NOT force false consensus).
6. State known limitations and unverified assumptions.
7. Provide 3-5 prioritized, concrete tasks with owner, timeline, and measurable KPI.

Respond strictly in JSON matching the CeoSynthesis schema."""
                ceo_synth_call = await asyncio.to_thread(
                    self._call_gemini_structured,
                    system_instruction=EXECUTIVE_SYSTEM_PROMPTS["ceo"],
                    prompt=ceo_synthesis_prompt,
                    response_schema=CeoSynthesis
                )
                synthesis = ceo_synth_call["data"]
                if ceo_synth_call.get("token_usage", {}).get("total_tokens"):
                    total_tokens += ceo_synth_call["token_usage"]["total_tokens"]
            except Exception as e:
                logger.error(f"Live Gemini CEO synthesis failed: {e}. Using simulation fallback.")
                synthesis = self._simulate_synthesis(question, business, metrics)
        else:
            synthesis = self._simulate_synthesis(question, business, metrics)

        # Yield CEO final message
        synth_content = f"""### Final Decision & Recommendation
**{synthesis.get('final_recommendation')}**

**Justification:**
{synthesis.get('justification')}

**Debate Summary & Key Disagreements:**
""" + "\n".join(f"- {d}" for d in synthesis.get('core_disagreements_debated', []))

        if synthesis.get("preserved_minority_dissent"):
            synth_content += "\n\n**Preserved Minority Concerns:**\n" + "\n".join(f"- {md}" for md in synthesis.get('preserved_minority_dissent', []))

        if synthesis.get("known_limitations_and_uncertainties"):
            synth_content += "\n\n**Known Limitations & Data Gaps:**\n" + "\n".join(f"- {lim}" for lim in synthesis.get('known_limitations_and_uncertainties', []))

        synth_content += f"\n\n*Confidence Assessment:* {synthesis.get('confidence_statement')}"

        yield {
            "event": "message",
            "data": {
                "executive": "ceo",
                "stage": "ceo_synthesis",
                "content": synth_content,
                "evidence_refs": [],
                "assumptions": synthesis.get("known_limitations_and_uncertainties", []),
                "risks": synthesis.get("preserved_minority_dissent", []),
                "dissent": synthesis.get("preserved_minority_dissent", []),
                "is_simulated": synthesis.get("is_simulated", False)
            }
        }

        # Step 5: Final Complete Event
        yield {
            "event": "complete",
            "data": {
                "synthesis": synthesis,
                "model_used": model_name,
                "token_usage": {
                    "total_tokens": total_tokens if total_tokens > 0 else "N/A"
                },
                "is_simulated": not self.is_live() or synthesis.get("is_simulated", False)
            }
        }

orchestrator = GeminiOrchestrator()
