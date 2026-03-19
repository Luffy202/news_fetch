@echo off
setlocal
cd /d "%~dp0"

call scripts\stop.bat
echo.
echo Services stopped. Press any key to close.
pause >nul
