import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import engine, Base, get_db
from backend.app.routers import businesses, documents, transactions, meetings, tasks
from backend.app.services.sample_seeder import seed_sample_businesses, ensure_sample_files_exist
from backend.app.services.gemini_orchestrator import orchestrator

# Initialize database schema
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure sample data files exist and seed sample businesses
    ensure_sample_files_exist()
    db = next(get_db())
    try:
        seed_sample_businesses(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title="AI Executive Boardroom API",
    description="Multi-agent virtual executive boardroom powered by Google Gemini and deterministic Python financial calculators.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(businesses.router)
app.include_router(documents.router)
app.include_router(transactions.router)
app.include_router(meetings.router)
app.include_router(tasks.router)

@app.post("/api/seed-samples", tags=["samples"])
def trigger_seed_samples(db: Session = Depends(get_db)):
    """Seed or refresh the three core demo workspaces with realistic data."""
    seeded_ids = seed_sample_businesses(db)
    return {
        "status": "success",
        "message": "Seeded 3 sample business workspaces (Profit Decline, Product Launch, Channel Expansion).",
        "business_ids": seeded_ids
    }

@app.get("/api/health", tags=["system"])
def health_check():
    has_key = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    return {
        "status": "healthy",
        "gemini_live": orchestrator.is_live(),
        "configured_model": settings.GEMINI_MODEL,
        "api_key_configured": has_key,
        "simulation_mode_allowed": settings.ALLOW_SIMULATION_MODE,
        "database": settings.DATABASE_URL.split("///")[-1]
    }
