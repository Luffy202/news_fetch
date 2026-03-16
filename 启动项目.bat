@echo off
setlocal
cd /d "%~dp0"

echo Select login mode:
echo 1^) auto (default, env first, fallback to Playwright)
echo 2^) env (env only)
echo 3^) playwright (QR login only)
choice /C 123 /N /M "Enter 1/2/3, default is 1: "
if errorlevel 3 (
  set "AUTH_MODE=playwright"
) else if errorlevel 2 (
  set "AUTH_MODE=env"
  set /p WECHAT_COOKIE=Please enter WECHAT_COOKIE: 
  set /p WECHAT_TOKEN=Please enter WECHAT_TOKEN: 
) else (
  set "AUTH_MODE=auto"
)

call scripts\start.bat
echo.
echo Startup finished. Press any key to close.
pause >nul
