@echo off
setlocal
cd /d "%~dp0"

set "LOCKFILE=scripts\.start.lock"

if exist "%LOCKFILE%" (
  echo.
  echo [提示] 启动脚本已在运行中，请勿重复启动。
  echo 如果确认没有在运行，请手动删除 %LOCKFILE% 后重试。
  echo.
  pause
  exit /b 1
)

echo.> "%LOCKFILE%"

set "BACKEND_RUN_MODE=local"
set "AUTH_MODE=auto"

call scripts\start.bat
set "EXIT_CODE=%errorlevel%"

del /f /q "%LOCKFILE%" >nul 2>&1

echo.
if %EXIT_CODE% equ 0 (
  echo 启动完成。关闭此窗口不影响后台服务运行。
) else (
  echo 启动过程中出现错误，请检查上方日志。
)
echo 按任意键关闭此窗口...
pause >nul
exit /b %EXIT_CODE%
