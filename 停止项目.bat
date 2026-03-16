@echo off
setlocal
cd /d "%~dp0"

call scripts\stop.bat
echo.
echo 服务已停止，按任意键关闭窗口。
pause >nul
