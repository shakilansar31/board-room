#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  Starting AI Executive Boardroom (Neo-Brutalism + INR)"
echo "========================================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed or not in PATH."
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    exit 1
fi

# Create .env if not present
if [ ! -f ".env" ]; then
    echo "[INFO] Copying .env.example to .env..."
    cp .env.example .env
fi

# Setup Python venv
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating Python virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

# Setup Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "[INFO] Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "[1/2] Starting FastAPI Backend on http://localhost:8000 ..."
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "[2/2] Starting Next.js Frontend on http://localhost:3000 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

echo ""
echo "========================================================"
echo "  All systems running!"
echo "  Frontend: http://localhost:3000"
echo "  API Docs: http://localhost:8000/docs"
echo "========================================================"
wait
