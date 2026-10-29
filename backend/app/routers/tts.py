from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional
from backend.app.services.tts_service import generate_speech_audio, EXECUTIVE_VOICES, clean_text_for_speech

router = APIRouter(prefix="/api/tts", tags=["TTS"])

class TTSRequest(BaseModel):
    text: str
    executive: str = "ceo"

@router.post("/speak")
async def speak_text(req: TTSRequest):
    """
    Generate neural speech audio for an executive persona.
    Returns MP3 audio bytes with distinct voice per agent.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    try:
        audio_bytes = await generate_speech_audio(req.text, req.executive)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {str(e)}")

@router.get("/voices")
async def list_executive_voices():
    """
    List configured open-source neural voices for each executive persona.
    """
    return {
        "voices": [
            {"executive": "ceo", "name": "Elena Vance", "voice_id": EXECUTIVE_VOICES["ceo"], "role": "CEO & Moderator (Female)"},
            {"executive": "cfo", "name": "Marcus Sterling", "voice_id": EXECUTIVE_VOICES["cfo"], "role": "CFO & Finance (Male, Authoritative)"},
            {"executive": "cmo", "name": "Sophia Chen", "voice_id": EXECUTIVE_VOICES["cmo"], "role": "CMO & Marketing (Female, Expressive)"},
            {"executive": "coo", "name": "David Keller", "voice_id": EXECUTIVE_VOICES["coo"], "role": "COO & Operations (Male, Pragmatic)"},
            {"executive": "cto", "name": "Alex Rivera", "voice_id": EXECUTIVE_VOICES["cto"], "role": "CTO & Systems (Male, Articulate)"},
        ]
    }
