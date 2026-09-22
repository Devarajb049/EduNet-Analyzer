@echo off
title EduNet Analyzer Launcher
echo ==============================================================
echo        EduNet Analyzer - Network Simulator & Analyzer
echo ==============================================================
echo.
echo 1. Launching Python FastAPI Backend (Port 8000)...
start "EduNet Analyzer [Backend API]" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo 2. Launching React Vite Frontend (Port 5173)...
start "EduNet Analyzer [Frontend]" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==============================================================
echo  EduNet Analyzer is launching in separate background windows!
echo  - Frontend UI:  http://localhost:5173
echo  - Backend Docs: http://127.0.0.1:8000/docs
echo ==============================================================
pause
