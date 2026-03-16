@echo off
setlocal
cd /d "%~dp0"

echo 请选择登录模式：
echo 1^) auto（默认，优先环境变量，缺失则尝试 Playwright）
echo 2^) env（仅环境变量）
echo 3^) playwright（仅扫码登录）
choice /C 123 /N /M "输入 1/2/3，默认 1: "
if errorlevel 3 (
  set "AUTH_MODE=playwright"
) else if errorlevel 2 (
  set "AUTH_MODE=env"
  set /p WECHAT_COOKIE=请输入 WECHAT_COOKIE: 
  set /p WECHAT_TOKEN=请输入 WECHAT_TOKEN: 
) else (
  set "AUTH_MODE=auto"
)

call scripts\start.bat
echo.
echo 启动完成，按任意键关闭窗口。
pause >nul
