@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

set "AUTH_MODE_VALUE=%AUTH_MODE%"
if "%AUTH_MODE_VALUE%"=="" set "AUTH_MODE_VALUE=auto"
set "BACKEND_RUN_MODE_VALUE=%BACKEND_RUN_MODE%"
if "%BACKEND_RUN_MODE_VALUE%"=="" set "BACKEND_RUN_MODE_VALUE=local"
set "STARTUP_ERROR_LOG=output\startup-error.log"
set "LOCAL_BACKEND_LOG=output\local-backend.log"

echo AUTH_MODE=%AUTH_MODE_VALUE%
echo BACKEND_RUN_MODE=%BACKEND_RUN_MODE_VALUE%

if /I "%BACKEND_RUN_MODE_VALUE%"=="docker" goto :start_docker

call :ensure_local_python_runtime
if errorlevel 1 exit /b 1

call :ensure_frontend_dist
if errorlevel 1 exit /b 1

call :check_backend_healthy
if /I "!SERVICE_STATUS!"=="healthy" (
  call :clear_startup_error
  echo 本地服务已在运行，直接打开工作台。
  echo Frontend: http://localhost:8000
  echo Backend:  http://localhost:8000
  call :open_browser "http://localhost:8000"
  exit /b 0
)

if /I "!SERVICE_STATUS!"=="port_conflict" (
  call :write_startup_error "端口 8000 已被其他程序占用，请先释放后重试。"
  echo 端口 8000 已被其他程序占用，请先释放后重试。
  exit /b 1
)

call :clear_startup_error
call :stop_local_backend
call :start_local_backend
if errorlevel 1 exit /b 1

echo Frontend: http://localhost:8000
echo Backend:  http://localhost:8000
call :open_browser "http://localhost:8000"
exit /b 0

:start_docker
call :clear_startup_error
docker compose up -d --build
if errorlevel 1 (
  call :write_startup_error "Docker 启动失败，请检查 Docker Desktop 或 compose 日志。"
  echo Docker 启动失败，请检查 Docker Desktop 或 compose 日志。
  exit /b 1
)
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:8000
call :open_browser "http://localhost:8080"
exit /b 0

:ensure_local_python_runtime
set "PYTHON_CMD="
where py >nul 2>&1 && py -3 -V >nul 2>&1 && set "PYTHON_CMD=py -3"
if "%PYTHON_CMD%"=="" (
  where python >nul 2>&1 && python -V >nul 2>&1 && set "PYTHON_CMD=python"
)
if "%PYTHON_CMD%"=="" (
  where python3 >nul 2>&1 && python3 -V >nul 2>&1 && set "PYTHON_CMD=python3"
)
if "%PYTHON_CMD%"=="" (
  call :write_startup_error "未找到可用的 Python 命令（py -3 / python / python3）。"
  echo 未找到可用的 Python 命令（py -3 / python / python3）。
  exit /b 1
)

%PYTHON_CMD% -c "import fastapi,uvicorn,sqlalchemy,requests,bs4,lxml,playwright" >nul 2>&1
if errorlevel 1 (
  echo 正在安装 Python 依赖...
  %PYTHON_CMD% -m pip install -r requirements.txt
  if errorlevel 1 exit /b 1
  %PYTHON_CMD% -m pip install -r backend\requirements.txt
  if errorlevel 1 exit /b 1
)

call :needs_playwright_browser
if /I "!NEEDS_PLAYWRIGHT!"=="1" (
  %PYTHON_CMD% -c "from playwright.sync_api import sync_playwright; p=sync_playwright().start(); import os,sys; path=p.chromium.executable_path; p.stop(); sys.exit(0 if os.path.exists(path) else 1)" >nul 2>&1
  if errorlevel 1 (
    echo 正在安装 Playwright Chromium...
    %PYTHON_CMD% -m playwright install chromium
    if errorlevel 1 exit /b 1
  )
)
exit /b 0

:needs_playwright_browser
set "NEEDS_PLAYWRIGHT=1"
if /I "%AUTH_MODE_VALUE%"=="env" set "NEEDS_PLAYWRIGHT=0"
if /I "%AUTH_MODE_VALUE%"=="auto" if not "%WECHAT_COOKIE%"=="" if not "%WECHAT_TOKEN%"=="" set "NEEDS_PLAYWRIGHT=0"
exit /b 0

:ensure_frontend_dist
if /I "%SKIP_FRONTEND_BUILD%"=="1" exit /b 0
if exist "frontend\dist\index.html" exit /b 0

where npm >nul 2>&1
if errorlevel 1 (
  call :write_startup_error "未检测到 npm，无法构建前端页面。请先安装 Node.js。"
  echo 未检测到 npm，无法构建前端页面。请先安装 Node.js。
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo 正在安装前端依赖...
  pushd frontend
  npm install
  if errorlevel 1 (
    popd
    exit /b 1
  )
  popd
)

echo 正在构建前端静态资源...
pushd frontend
npm run build
if errorlevel 1 (
  popd
  exit /b 1
)
popd
exit /b 0

:check_backend_healthy
set "SERVICE_STATUS=stopped"
%PYTHON_CMD% -c "import sys,urllib.request; import json; response=urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); sys.exit(0 if response.status == 200 else 1)" >nul 2>&1
if not errorlevel 1 (
  set "SERVICE_STATUS=healthy"
  exit /b 0
)
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 set "SERVICE_STATUS=port_conflict"
exit /b 0

:stop_local_backend
taskkill /FI "WINDOWTITLE eq news-fetch-local-backend" /T /F >nul 2>&1
del /f /q ".local_backend.pid" >nul 2>&1
exit /b 0

:start_local_backend
if not exist output mkdir output
set "LOCAL_BACKEND_CMD=cd /d ""%cd%"" && set AUTH_MODE=%AUTH_MODE_VALUE% && set BACKEND_RUN_MODE=local && set WECHAT_COOKIE=%WECHAT_COOKIE% && set WECHAT_TOKEN=%WECHAT_TOKEN% && set KIMI_API_KEY=%KIMI_API_KEY% && set FEISHU_WEBHOOK=%FEISHU_WEBHOOK% && %PYTHON_CMD% -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 >> output\local-backend.log 2>&1"
start "news-fetch-local-backend" /min cmd /c "%LOCAL_BACKEND_CMD%"
if errorlevel 1 (
  call :write_startup_error "本地后端启动失败。"
  echo 本地后端启动失败。
  exit /b 1
)

for /L %%I in (1,1,60) do (
  timeout /t 1 >nul
  call :check_backend_healthy
  if /I "!SERVICE_STATUS!"=="healthy" exit /b 0
)

call :write_startup_error "本地后端启动失败，请查看 output\local-backend.log。"
echo 本地后端启动失败，请查看 output\local-backend.log。
exit /b 1

:write_startup_error
if not exist output mkdir output
> "%STARTUP_ERROR_LOG%" echo %~1
exit /b 0

:clear_startup_error
if not exist output mkdir output
del /f /q "%STARTUP_ERROR_LOG%" >nul 2>&1
exit /b 0

:open_browser
if "%AUTO_OPEN_BROWSER%"=="" set "AUTO_OPEN_BROWSER=1"
if /I "%AUTO_OPEN_BROWSER%"=="0" exit /b 0
start "" %~1
exit /b 0
