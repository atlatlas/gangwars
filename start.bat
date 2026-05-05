@echo off
title Gang Wars
echo === Killing all Node.js processes ===
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo === Starting Backend (port 3006) ===
start "GangWars-Backend" cmd /c "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo === Starting Frontend (port 3000) ===
start "GangWars-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3006
echo Frontend: http://localhost:3000
echo.
echo Close this window to stop both servers.
pause
