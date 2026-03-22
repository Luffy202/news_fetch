@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "PYTHONUNBUFFERED=1"

set "AUTH_MODE_VALUE=%AUTH_MODE%"
if "%AUTH_MODE_VALUE%"=="" set "AUTH_MODE_VALUE=auto"
set "BACKEND_RUN_MODE_VALUE=%BACKEND_RUN_MODE%"
if "%BACKEND_RUN_MODE_VALUE%"=="" set "BACKEND_RUN_MODE_VALUE=local"
set "BACKEND_WINDOW_MODE_VALUE=%BACKEND_WINDOW_MODE%"
if "%BACKEND_WINDOW_MODE_VALUE%"=="" set "BACKEND_WINDOW_MODE_VALUE=minimized"
set "BACKEND_STARTUP_TIMEOUT_VALUE=%BACKEND_STARTUP_TIMEOUT%"
if "%BACKEND_STARTUP_TIMEOUT_VALUE%"=="" set "BACKEND_STARTUP_TIMEOUT_VALUE=60"
set "STARTUP_ERROR_LOG=output\startup-error.log"
set "LOCAL_BACKEND_LOG=output\local-backend.log"
set "START_LOCK_DIR=scripts\.start.lock"
set "START_LOCK_STALE_SECONDS=300"

call :acquire_start_lock
if errorlevel 1 exit /b 1

call :run_startup
set "START_EXIT_CODE=%errorlevel%"
call :release_start_lock
exit /b %START_EXIT_CODE%

:run_startup
call :log_info "AUTH_MODE=%AUTH_MODE_VALUE%"
call :log_info "BACKEND_RUN_MODE=%BACKEND_RUN_MODE_VALUE%"

if /I "%BACKEND_RUN_MODE_VALUE%"=="docker" goto :start_docker

call :log_step "Checking local Python runtime"
call :ensure_local_python_runtime
if errorlevel 1 exit /b 1

call :log_step "Checking frontend build output"
call :ensure_frontend_dist
if errorlevel 1 exit /b 1

call :log_step "Checking backend health"
call :check_backend_healthy
if /I "!SERVICE_STATUS!"=="healthy" (
  call :clear_startup_error
  call :log_info "Local service is already running."
  call :log_info "Frontend: http://localhost:8000"
  call :log_info "Backend:  http://localhost:8000"
  call :open_browser "http://localhost:8000"
  exit /b 0
)

if /I "!SERVICE_STATUS!"=="port_conflict" (
  call :write_startup_error "Port 8000 is already in use. Free the port and try again."
  call :log_error "Port 8000 is already in use. Free the port and try again."
  exit /b 1
)

call :clear_startup_error
call :log_step "Starting local backend"
call :start_local_backend
if errorlevel 1 exit /b 1

call :log_info "Frontend: http://localhost:8000"
call :log_info "Backend:  http://localhost:8000"
call :open_browser "http://localhost:8000"
exit /b 0

:start_docker
call :clear_startup_error
call :log_step "Starting Docker services"
docker compose up -d --build
if errorlevel 1 (
  call :write_startup_error "Docker startup failed. Check Docker Desktop and compose logs."
  call :log_error "Docker startup failed. Check Docker Desktop and compose logs."
  exit /b 1
)
call :log_info "Frontend: http://localhost:8080"
call :log_info "Backend:  http://localhost:8000"
call :open_browser "http://localhost:8080"
exit /b 0

:acquire_start_lock
if exist "%START_LOCK_DIR%" (
  call :check_start_lock_stale
  if /I "!START_LOCK_IS_STALE!"=="1" (
    call :log_info "Removing stale startup lock."
    rd /s /q "%START_LOCK_DIR%" >nul 2>&1
  )
)

mkdir "%START_LOCK_DIR%" >nul 2>&1
if errorlevel 1 (
  call :write_startup_error "Another startup process is already running. Wait for it to finish and try again."
  call :log_error "Another startup process is already running. Wait for it to finish and try again."
  exit /b 1
)

> "%START_LOCK_DIR%\owner.txt" echo %DATE% %TIME%
exit /b 0

:release_start_lock
if exist "%START_LOCK_DIR%" rd /s /q "%START_LOCK_DIR%" >nul 2>&1
exit /b 0

:check_start_lock_stale
set "START_LOCK_IS_STALE=0"
call :check_backend_healthy
if /I "!SERVICE_STATUS!"=="healthy" (
  set "START_LOCK_IS_STALE=1"
  exit /b 0
)

set "START_LOCK_AGE_SECONDS=0"
for /f %%R in ('powershell -NoProfile -Command "$path = 'scripts/.start.lock'; if (Test-Path -LiteralPath $path) { [int][Math]::Floor(((Get-Date).ToUniversalTime() - (Get-Item -LiteralPath $path).LastWriteTimeUtc).TotalSeconds) } else { 0 }"') do set "START_LOCK_AGE_SECONDS=%%R"
if !START_LOCK_AGE_SECONDS! GEQ %START_LOCK_STALE_SECONDS% set "START_LOCK_IS_STALE=1"
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
  call :write_startup_error "No supported Python command was found. Tried: py -3, python, python3."
  call :log_error "No supported Python command was found. Tried: py -3, python, python3."
  exit /b 1
)
call :log_info "Using Python command: %PYTHON_CMD%"

%PYTHON_CMD% -c "import fastapi,uvicorn,sqlalchemy,requests,bs4,lxml,playwright" >nul 2>&1
if errorlevel 1 (
  call :log_info "Installing Python dependencies"
  %PYTHON_CMD% -m pip install -r requirements.txt
  if errorlevel 1 exit /b 1
  %PYTHON_CMD% -m pip install -r backend\requirements.txt
  if errorlevel 1 exit /b 1
)

call :needs_playwright_browser
if /I "!NEEDS_PLAYWRIGHT!"=="1" (
  %PYTHON_CMD% -c "from playwright.sync_api import sync_playwright; p=sync_playwright().start(); import os,sys; path=p.chromium.executable_path; p.stop(); sys.exit(0 if os.path.exists(path) else 1)" >nul 2>&1
  if errorlevel 1 (
    call :log_info "Installing Playwright Chromium"
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

call :frontend_build_required
if /I "!FRONTEND_BUILD_REQUIRED!"=="0" (
  call :log_info "Frontend build output is up to date"
  exit /b 0
)

where npm >nul 2>&1
if errorlevel 1 (
  call :write_startup_error "npm was not found. Install Node.js before starting the project."
  call :log_error "npm was not found. Install Node.js before starting the project."
  exit /b 1
)

if not exist "frontend\node_modules" (
  call :log_info "Installing frontend dependencies"
  pushd frontend
  npm install
  if errorlevel 1 (
    popd
    exit /b 1
  )
  popd
)

call :log_info "Building frontend assets"
pushd frontend
npm run build
if errorlevel 1 (
  popd
  exit /b 1
)
popd
exit /b 0

:frontend_build_required
set "FRONTEND_BUILD_REQUIRED=0"
if not exist "frontend\dist\index.html" (
  set "FRONTEND_BUILD_REQUIRED=1"
  exit /b 0
)
for /f %%R in ('powershell -NoProfile -Command ^
  "$dist = Get-Item -LiteralPath 'frontend/dist/index.html';" ^
  "$sources = @(" ^
  "  Get-ChildItem -LiteralPath 'frontend/src' -Recurse -File;" ^
  "  Get-Item -LiteralPath 'frontend/index.html';" ^
  "  Get-Item -LiteralPath 'frontend/package.json';" ^
  "  Get-Item -LiteralPath 'frontend/package-lock.json' -ErrorAction SilentlyContinue;" ^
  "  Get-Item -LiteralPath 'frontend/tsconfig.json' -ErrorAction SilentlyContinue;" ^
  "  Get-Item -LiteralPath 'frontend/vite.config.ts' -ErrorAction SilentlyContinue" ^
  ") | Where-Object { $_ };" ^
  "$latest = $sources | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1;" ^
  "if ($latest -and $latest.LastWriteTimeUtc -gt $dist.LastWriteTimeUtc) { '1' } else { '0' }"') do set "FRONTEND_BUILD_REQUIRED=%%R"
exit /b 0

:check_backend_healthy
set "SERVICE_STATUS=stopped"
%PYTHON_CMD% -c "import sys,urllib.request; response=urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); sys.exit(0 if response.status == 200 else 1)" >nul 2>&1
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
type nul > "%LOCAL_BACKEND_LOG%"
set "LAST_LOG_LINE=0"
set "AUTH_MODE=%AUTH_MODE_VALUE%"
set "BACKEND_RUN_MODE=local"
set "LOCAL_BACKEND_CMD=cd /d ""%cd%"" && %PYTHON_CMD% -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 >> output\local-backend.log 2>&1"
if /I "%BACKEND_WINDOW_MODE_VALUE%"=="visible" (
  start "news-fetch-local-backend" cmd /c "%LOCAL_BACKEND_CMD%"
) else (
  start "news-fetch-local-backend" /min cmd /c "%LOCAL_BACKEND_CMD%"
)
if errorlevel 1 (
  call :write_startup_error "Local backend failed to start."
  call :log_error "Local backend failed to start."
  exit /b 1
)

call :log_info "Backend process launched. Waiting for health check"
call :log_info "Live backend output is being written to output\local-backend.log"
for /L %%I in (1,1,%BACKEND_STARTUP_TIMEOUT_VALUE%) do (
  timeout /t 1 >nul
  call :emit_backend_log_updates
  call :check_backend_healthy
  if /I "!SERVICE_STATUS!"=="healthy" (
    call :log_info "Backend is healthy after %%I seconds."
    exit /b 0
  )
  call :log_info "Backend startup progress: %%I/%BACKEND_STARTUP_TIMEOUT_VALUE% seconds"
)

call :write_startup_error "Local backend did not become healthy in time. Check output\local-backend.log."
call :log_error "Local backend did not become healthy in time. Check output\local-backend.log."
exit /b 1

:emit_backend_log_updates
set "CURRENT_LOG_LINE=0"
for /f %%C in ('powershell -NoProfile -Command "$path = 'output/local-backend.log'; if (Test-Path -LiteralPath $path) { [int](Get-Content -LiteralPath $path).Count } else { 0 }"') do set "CURRENT_LOG_LINE=%%C"
if !CURRENT_LOG_LINE! LEQ !LAST_LOG_LINE! exit /b 0
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$path = 'output/local-backend.log'; $skip = 0; if ($env:LAST_LOG_LINE -match '^\d+$') { $skip = [int]$env:LAST_LOG_LINE }; if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path | Select-Object -Skip $skip }"`) do echo [backend] %%L
set "LAST_LOG_LINE=!CURRENT_LOG_LINE!"
exit /b 0

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
set "OPEN_URL=%~1"
echo %OPEN_URL% | findstr /C:"?" >nul 2>&1
if errorlevel 1 set "OPEN_URL=%OPEN_URL%?startup_ts=%RANDOM%%RANDOM%"
start "" "%OPEN_URL%"
exit /b 0

:log_step
echo.
echo [STEP] %~1
exit /b 0

:log_info
echo [INFO] %~1
exit /b 0

:log_error
echo [ERROR] %~1
exit /b 0
