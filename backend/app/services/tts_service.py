import re
import io
import hashlib
import logging
from typing import Dict
import edge_tts

logger = logging.getLogger("boardroom.tts")

# Distinct professional voice mapping for each C-suite persona
EXECUTIVE_VOICES: Dict[str, str] = {
    "ceo": "en-US-JennyNeural",         # Elena Vance - Sophisticated, executive female tone
    "cfo": "en-US-GuyNeural",           # Marcus Sterling - Deep, analytical, authoritative male tone
    "cmo": "en-US-AriaNeural",          # Sophia Chen - Expressive, dynamic, persuasive female tone
    "coo": "en-US-ChristopherNeural",   # David Keller - Grounded, pragmatic, steady male tone
    "cto": "en-US-EricNeural",          # Alex Rivera - Articulate, modern tech male tone
}

# In-memory audio cache to avoid re-generating identical speech
_audio_cache: Dict[str, bytes] = {}

def clean_text_for_speech(text: str, executive: str = "ceo") -> str:
    """
    Cleans markdown formatting, currency symbols, and citations so the TTS
    delivers a natural, conversational executive delivery rather than reading code.
    """
    if not text:
        return ""

    # Replace Rupee symbol with 'Rupees ' so TTS pronounces it correctly
    cleaned = text.replace("₹", "Rupees ")
    cleaned = cleaned.replace("INR", "Rupees")

    # Expand common financial abbreviations for natural speaking
    cleaned = re.sub(r'\bMoM\b', 'month over month', cleaned)
    cleaned = re.sub(r'\bYoY\b', 'year over year', cleaned)
    cleaned = re.sub(r'\bCAC\b', 'customer acquisition cost', cleaned)
    cleaned = re.sub(r'\bLTV\b', 'lifetime value', cleaned)
    cleaned = re.sub(r'\bMOQ\b', 'minimum order quantity', cleaned)
    cleaned = re.sub(r'\bROI\b', 'return on investment', cleaned)
    cleaned = re.sub(r'\bEBITDA\b', 'operating earnings', cleaned)

    # Strip markdown headers (e.g. ### Heading)
    cleaned = re.sub(r'#+\s*', '', cleaned)

    # Strip markdown bold/italics (e.g. **bold**, *italic*)
    cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)
    cleaned = re.sub(r'\*([^*]+)\*', r'\1', cleaned)

    # Strip bullet points and list numbers at start of lines
    cleaned = re.sub(r'^\s*[-*•]\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^\s*\d+\.\s*', '', cleaned, flags=re.MULTILINE)

    # Strip structured json-like or table delimiters
    cleaned = re.sub(r'\|', ' ', cleaned)
    cleaned = re.sub(r'`[^`]*`', '', cleaned)

    # Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    # Limit speaking length per turn if extremely verbose (keep first 800 chars for natural conversation)
    if len(cleaned) > 850:
        sentences = re.split(r'(?<=[.!?]) +', cleaned)
        truncated = []
        curr_len = 0
        for s in sentences:
            if curr_len + len(s) > 800:
                break
            truncated.append(s)
            curr_len += len(s)
        cleaned = " ".join(truncated) if truncated else cleaned[:800]

    return cleaned

async def generate_speech_audio(text: str, executive: str = "ceo") -> bytes:
    """
    Generates high-fidelity MP3 neural voice audio using open-source Edge-TTS.
    Each executive has a distinct voice profile.
    """
    cleaned = clean_text_for_speech(text, executive)
    if not cleaned:
        cleaned = "Thank you. Let us proceed with the discussion."

    voice = EXECUTIVE_VOICES.get(executive.lower(), "en-US-JennyNeural")

    # Cache key based on voice and text content
    cache_key = hashlib.md5(f"{voice}:{cleaned}".encode("utf-8")).hexdigest()
    if cache_key in _audio_cache:
        return _audio_cache[cache_key]

    try:
        communicate = edge_tts.Communicate(cleaned, voice)
        buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])
        
        audio_data = buffer.getvalue()
        if len(_audio_cache) < 200:
            _audio_cache[cache_key] = audio_data
        return audio_data
    except Exception as e:
        logger.error(f"Edge-TTS speech generation error for {executive}: {e}")
        raise
