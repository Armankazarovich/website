@echo off
setlocal
cd /d "%~dp0"

echo Starting PiloRus local site on http://localhost:3101/catalog
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-dev.ps1" -Port 3101

echo.
echo If the browser did not open, use:
echo http://localhost:3101/catalog
echo.
pause
