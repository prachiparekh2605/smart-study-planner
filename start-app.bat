@echo off
title StudyMind AI - App Launcher
color 0B
echo =========================================================
echo       Starting StudyMind AI Full-Stack App
echo =========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting AI Backend Server (FastAPI)...
start "StudyMind Backend" /min cmd /c "python backend/run_server.py"

echo [2/3] Waiting for Backend to initialize...
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend App...
cd frontend
start "StudyMind Frontend" /min cmd /c "npm run dev"

timeout /t 2 /nobreak >nul
echo Opening StudyMind AI in your browser...
start http://localhost:5173

echo.
echo =========================================================
echo   StudyMind AI is now running!
echo   Frontend : http://localhost:5173
echo   API Docs : http://localhost:8000/docs
echo   Demo Login: student@example.com / password123
echo =========================================================
echo.
echo Press any key to exit this launcher (servers continue running)...
pause >nul
