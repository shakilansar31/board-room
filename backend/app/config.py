import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    # Recommended Gemini models: gemini-3.8-flash or gemini-2.5-flash
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    # Tavily Web Search API Key for real-world strategy & market intelligence
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./boardroom.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    # Simulation mode fallback when no key is set or explicitly enabled
    ALLOW_SIMULATION_MODE: bool = os.getenv("ALLOW_SIMULATION_MODE", "true").lower() in ("true", "1", "yes")

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
