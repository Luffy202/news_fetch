@echo off
setlocal
cd /d "%~dp0"

set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "PYTHONUNBUFFERED=1"

set "BACKEND_RUN_MODE=local"
set "AUTH_MODE=auto"

call scripts\start.bat
set "EXIT_CODE=%errorlevel%"

echo.
if %EXIT_CODE% equ 0 (
  echo [INFO] Startup finished. Closing this window will not stop the backend service.
) else (
  echo [ERROR] Startup failed. Review the log output above.
)
echo [INFO] Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%
