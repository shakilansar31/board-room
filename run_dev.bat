@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================================
echo   AI Executive Boardroom (FastAPI + Next.js + Tavily)
echo ========================================================

REM Check if Python is installed
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.11+.
    pause
    exit /b 1
)

REM Check if Node is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo [INFO] No .env found. Copying from .env.example...
    copy .env.example .env >nul
    echo [NOTICE] Created .env with default settings.
)

REM Python venv check
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo [INFO] Installing Python dependencies...
    pip install -r requirements.txt
)

REM Frontend dependencies check
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Boardroom Backend" cmd /k "cd /d ""%~dp0"" && .venv\Scripts\activate.bat && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "Boardroom Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ========================================================
echo  All systems running!
echo  Frontend: http://localhost:3000
echo  API Docs: http://localhost:8000/docs
echo ========================================================
echo  You can minimize this window. Press any key to close it.
pause >nul
