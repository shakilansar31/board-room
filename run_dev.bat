@echo off
cd /d "%~dp0"
echo ========================================================
echo   Starting AI Executive Boardroom (Neo-Brutalism + INR)
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
    echo [NOTICE] Created .env with default settings. You can add your GEMINI_API_KEY inside .env anytime!
)

REM Python venv check
if not exist ".venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo [INFO] Installing Python dependencies...
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

REM Frontend dependencies check
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm.cmd install
    cd ..
)

echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Boardroom Backend" cmd /k "cd /d \"%~dp0\" && call .venv\Scripts\activate.bat && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "Boardroom Frontend" cmd /k "cd /d \"%~dp0frontend\" && call npm.cmd run dev"

echo.
echo ========================================================
echo  All systems running!
echo  Frontend: http://localhost:3000
echo  API Docs: http://localhost:8000/docs
echo ========================================================
echo  Press any key to close this launcher (servers keep running in their own windows).
pause >nul
