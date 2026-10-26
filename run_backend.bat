@echo off
echo Starting AI Executive Boardroom Backend on http://localhost:8000...
call .venv\Scripts\activate.bat
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
