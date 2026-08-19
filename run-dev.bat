@echo off
title FocusSpace Time Tracker - Dev Server
cd /d "%~dp0"

echo ===================================================
echo   FocusSpace Time Tracker - Development Server
echo ===================================================
echo.

echo [INFO] Cleaning up any stale Node/Vite processes on ports 3000/4000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000, 4000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } | Out-Null; exit 0" >nul 2>&1

if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Starting API backend (port 4000) and Vite web server (port 3000)...
call npm run dev

pause
