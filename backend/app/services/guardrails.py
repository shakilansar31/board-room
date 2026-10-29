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

# Legitimate business keywords for scope verification
BUSINESS_KEYWORDS = [
    "revenue", "profit", "margin", "expense", "cogs", "cac", "ltv", "churn",
    "customer", "client", "market", "pricing", "price", "sales", "growth",
    "cash", "runway", "capital", "investment", "budget", "finance", "accounting",
    "inventory", "supply", "supplier", "vendor", "logistics", "shipping", "warehouse",
    "fulfillment", "operation", "operations", "process", "efficiency", "timeline",
    "team", "hiring", "payroll", "developer", "engineering", "capacity",
    "product", "launch", "saas", "software", "infrastructure", "aws", "cloud",
    "architecture", "integration", "api", "strategy", "strategic", "expansion",
    "store", "retail", "d2c", "e-commerce", "b2b", "b2c", "brand", "marketing",
    "ad", "ads", "acquisition", "conversion", "retention", "competitor", "business",
    "company", "startup", "scale", "roi", "unit economics", "payback", "contract"
]

# Explicit out-of-scope non-business keywords
OUT_OF_SCOPE_KEYWORDS = [
    "write a poem", "write a story", "tell a joke", "creative story", "fairy tale",
    "recipe for", "how to cook", "love advice", "dating advice", "astrology",
    "horoscope", "quantum physics", "game cheat", "video game walkthrough",
    "write a song", "rap lyrics", "fantasy fiction", "movie review", "celebrity gossip"
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
    
    # Check for explicit non-business requests
    for bad_phrase in OUT_OF_SCOPE_KEYWORDS:
        if bad_phrase in text_lower:
            return False, "This virtual boardroom is strictly dedicated to commercial business operations, marketing, financial analytics, and corporate strategy. Creative writing, personal advice, and casual entertainment are outside its mandate."

    # Verify presence of business or strategic context
    words = set(re.findall(r"\b[a-zA-Z]{3,}\b", text_lower))
    has_business_term = any(bw in text_lower for bw in BUSINESS_KEYWORDS)
    
    # Also allow standard corporate query words if question is structured
    corporate_question_words = ["should", "how", "what", "which", "can", "evaluate", "analyze", "compare", "recommend", "plan"]
    has_question_structure = any(qw in text_lower for qw in corporate_question_words)

    if not has_business_term and len(words) > 3 and not ("cost" in text_lower or "plan" in text_lower or "risk" in text_lower):
        return False, "The query does not contain recognizable commercial, financial, operational, or strategic business context. Please ask an inquiry relating to your company's revenue, margins, customer acquisition, or operational execution."

    return True, None

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

    # 2. Check business scope
    safe_scope, scope_reason = check_business_scope(text)
    if not safe_scope:
        return GuardrailResult(
            is_safe=False,
            refusal_reason=scope_reason,
            sanitized_text="",
            category="out_of_scope"
        )

    # Sanitize text (strip control characters and zero-width spaces)
    sanitized = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text).strip()
    return GuardrailResult(
        is_safe=True,
        refusal_reason=None,
        sanitized_text=sanitized,
        category="business"
    )
