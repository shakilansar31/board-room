# AI Executive Boardroom - Dual Process Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   AI EXECUTIVE BOARDROOM (GEMINI-POWERED) LAUNCHER       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend in separate process
Write-Host "`n[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Boardroom Backend...'; & .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Frontend in separate process
Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Boardroom Frontend...'; cd frontend; npm.cmd run dev"

Write-Host "`nBoth services launched! Open your browser at http://localhost:3000" -ForegroundColor Yellow
