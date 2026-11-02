@echo off
title EduNet Analyzer Launcher
setlocal enabledelayedexpansion

echo ==============================================================
echo        EduNet Analyzer - Network Simulator & Analyzer
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Ensure Python Virtual Environment exists
if not exist "backend\venv\Scripts\python.exe" (
    echo [*] Setting up Python virtual environment in backend\venv...
    where py >nul 2>&1
    if !errorlevel! equ 0 (
        py -m venv backend\venv
    ) else (
        python -m venv backend\venv
    )
    if not exist "backend\venv\Scripts\python.exe" (
        echo [ERROR] Failed to create Python virtual environment.
        echo Please ensure Python 3.10+ is installed on your system.
        pause
        exit /b 1
    )
)

:: 2. Ensure Backend Dependencies are installed
if not exist "backend\venv\Lib\site-packages\fastapi" (
    echo [*] Installing backend dependencies from requirements.txt...
    backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

:: 3. Ensure Frontend Dependencies are installed
if not exist "frontend\node_modules" (
    echo [*] Installing frontend npm dependencies...
    npm --prefix frontend install
)

echo.
echo [1/2] Launching Python FastAPI Backend (Port 8000)...
start "EduNet Analyzer [Backend API]" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching React Vite Frontend (Port 5173)...
start "EduNet Analyzer [Frontend UI]" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait 3 seconds for servers to initialize before opening browser
timeout /t 3 /nobreak >nul
echo.
echo [*] Opening application in browser...
start http://localhost:5173

echo.
echo ==============================================================
echo  EduNet Analyzer is running on localhost!
echo  - Frontend UI:  http://localhost:5173
echo  - Backend API:  http://127.0.0.1:8000
echo  - API Docs:     http://127.0.0.1:8000/docs
echo ==============================================================
echo  Close the background command windows to stop the servers.
pause
