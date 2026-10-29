import re
import logging
from typing import Tuple, Dict, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class GuardrailResult(BaseModel):
    is_safe: bool
    refusal_reason: Optional[str] = None
    sanitized_text: str
    category: str = "business" # "business" | "injection_detected" | "out_of_scope"

# Adversarial prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+|any\s+|prior\s+|previous\s+)?(instructions|prompts|rules|guidelines)",
    r"disregard\s+(all\s+|any\s+|prior\s+|previous\s+)?(instructions|prompts|rules|guidelines)",
    r"forget\s+(all\s+|any\s+|prior\s+|previous\s+)?(instructions|prompts|rules|guidelines)",
    r"you\s+are\s+now\s+(in\s+)?(developer|jailbreak|unrestricted|god|dan|evil|chaos)\s+mode",
    r"act\s+as\s+(an?\s+)?(unrestricted|jailbroken|evil|unfiltered|dan)\s+(ai|model|bot|assistant)",
    r"(reveal|show|print|output|repeat|echo)\s+(your\s+)?(system\s+prompt|initial\s+instructions|system\s+instructions)",
    r"<\|?(system|im_start|im_end|endoftext)\|?>",
    r"===\s*SYSTEM",
    r"```\s*(system|instruction)",
    r"sudo\s+make\s+me",
    r"bypass\s+safety",
    r"override\s+(system|safety|moderation|constraints)"
]

# Comprehensive commercial, financial, and strategic business vocabulary
BUSINESS_KEYWORDS = [
    # Financial metrics & metrics
    "revenue", "mrr", "arr", "profit", "margin", "margins", "expense", "expenses",
    "cogs", "cac", "ltv", "churn", "retention", "ebitda", "burn", "runway", "capital",
    "investment", "budget", "finance", "accounting", "cost", "costs", "pricing", "price",
    "lakh", "lakhs", "crore", "crores", "rupee", "rupees", "inr", "valuation", "roi",
    # Growth & Strategy
    "increase", "decrease", "grow", "growth", "scale", "scaling", "target", "targets",
    "market", "sales", "selling", "lead", "leads", "funnel", "conversion", "pipeline",
    "quota", "customer", "customers", "client", "clients", "user", "users", "subscriber",
    "subscribers", "strategy", "strategic", "expansion", "competitor", "competition",
    "d2c", "b2b", "b2c", "retail", "e-commerce", "brand", "marketing", "ad", "ads",
    "campaign", "acquisition",
    # Operations & Supply Chain
    "inventory", "supply", "supplier", "suppliers", "vendor", "vendors", "logistics",
    "shipping", "warehouse", "fulfillment", "operation", "operations", "process",
    "efficiency", "timeline", "payback", "contract", "moq", "procurement",
    # Technology & Engineering
    "team", "hiring", "hire", "payroll", "developer", "developers", "engineering",
    "capacity", "product", "launch", "features", "saas", "software", "infrastructure",
    "aws", "cloud", "architecture", "integration", "api", "apis", "code", "tech",
    # Timeframes & Goals
    "month", "months", "quarter", "quarters", "year", "years", "plan", "roadmap",
    "kpi", "kpis", "goal", "goals", "milestone", "milestones", "risk", "risks",
    "business", "company", "startup", "firm", "enterprise"
]

# Explicit out-of-scope non-business requests
OUT_OF_SCOPE_KEYWORDS = [
    "write a poem", "write a story", "tell a joke", "creative story", "fairy tale",
    "recipe for", "how to cook", "love advice", "dating advice", "astrology",
    "horoscope", "quantum physics", "game cheat", "video game walkthrough",
    "write a song", "rap lyrics", "fantasy fiction", "movie review", "celebrity gossip",
    "who is the president", "capital of", "tell me a tale"
]

def check_prompt_injection(text: str) -> Tuple[bool, Optional[str]]:
    """
    Scans text for adversarial prompt injection attempts and jailbreaks.
    """
    clean_text = text.strip()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, clean_text, re.IGNORECASE):
            logger.warning(f"Guardrail Alert: Prompt injection pattern matched '{pattern}'")
            return False, "Adversarial prompt injection pattern detected. The AI Executive Boardroom strictly rejects system override commands."
    return True, None

def check_business_scope(text: str) -> Tuple[bool, Optional[str]]:
    """
    Ensures that the inquiry is strictly bounded to legitimate commercial business topics.
    """
    text_lower = text.lower().strip()
    
    # 1. Check for explicit non-business phrases
    for bad_phrase in OUT_OF_SCOPE_KEYWORDS:
        if bad_phrase in text_lower:
            return False, "This virtual boardroom is strictly dedicated to commercial business operations, marketing, financial analytics, and corporate strategy. Creative writing, personal advice, and casual entertainment are outside its mandate."

    # 2. Tokenize words
    words = re.findall(r"\b[a-zA-Z0-9$₹%]+\b", text_lower)
    if len(words) < 2:
        return False, "Please enter a substantive strategic business question."

    # 3. Check for business keyword presence
    has_business_term = any(bw in text_lower for bw in BUSINESS_KEYWORDS)
    
    # Standard inquiry starters
    corporate_question_words = ["should", "how", "what", "which", "can", "evaluate", "analyze", "compare", "recommend", "plan", "where", "why", "is"]
    has_question_structure = any(qw in text_lower for qw in corporate_question_words)

    # If it has business terms or valid corporate phrasing, approve it
    if has_business_term:
        return True, None

    if has_question_structure and any(w in text_lower for w in ["increase", "reduce", "grow", "cut", "save", "improve", "optimize", "launch", "manage", "hire", "spend", "rate"]):
        return True, None

    # Only reject if neither business terms nor commercial optimization words are found
    return False, "The query does not contain recognizable commercial, financial, operational, or strategic business context. Please ask an inquiry relating to your company's revenue, margins, customer acquisition, or operational execution."

def validate_input_guardrails(text: str) -> GuardrailResult:
    """
    Comprehensive guardrail validator combining injection defense and business scope boundary.
    """
    # 1. Check prompt injection
    safe_injection, injection_reason = check_prompt_injection(text)
    if not safe_injection:
        return GuardrailResult(
            is_safe=False,
            refusal_reason=injection_reason,
            sanitized_text="",
            category="injection_detected"
        )

    # 2. Check business domain scope
    in_scope, scope_reason = check_business_scope(text)
    if not in_scope:
        return GuardrailResult(
            is_safe=False,
            refusal_reason=scope_reason,
            sanitized_text="",
            category="out_of_scope"
        )

    # Sanitize text
    sanitized = text.strip()
    # Strip dangerous HTML / script tags
    sanitized = re.sub(r'<script.*?>.*?</script>', '', sanitized, flags=re.DOTALL | re.IGNORECASE)
    sanitized = re.sub(r'<.*?>', '', sanitized)

    return GuardrailResult(
        is_safe=True,
        refusal_reason=None,
        sanitized_text=sanitized,
        category="business"
    )
