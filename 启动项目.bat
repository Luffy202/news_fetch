@echo off
setlocal
cd /d "%~dp0"

echo Select login mode:
echo 1^) auto (default, env first, fallback to Playwright)
echo 2^) env (env only)
echo 3^) playwright (QR login only)
set "LOGIN_MODE="
set /p LOGIN_MODE=Enter 1/2/3, default is 1: 
set "LOGIN_MODE=%LOGIN_MODE: =%"
if "%LOGIN_MODE%"=="" set "LOGIN_MODE=1"
if "%LOGIN_MODE%"=="3" (
  set "AUTH_MODE=playwright"
) else if "%LOGIN_MODE%"=="2" (
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
