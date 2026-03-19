@echo off
setlocal
cd /d "%~dp0\.."

set "AUTH_MODE_VALUE=%AUTH_MODE%"
if "%AUTH_MODE_VALUE%"=="" set "AUTH_MODE_VALUE=auto"
set "BACKEND_RUN_MODE_VALUE=%BACKEND_RUN_MODE%"
if "%BACKEND_RUN_MODE_VALUE%"=="" set "BACKEND_RUN_MODE_VALUE=docker"
set "FRONTEND_RUN_MODE_VALUE=%FRONTEND_RUN_MODE%"
if "%FRONTEND_RUN_MODE_VALUE%"=="" set "FRONTEND_RUN_MODE_VALUE=auto"
if /I "%FRONTEND_RUN_MODE_VALUE%"=="auto" (
  if /I "%BACKEND_RUN_MODE_VALUE%"=="local" (
    set "FRONTEND_RUN_MODE_VALUE=local"
  ) else (
    set "FRONTEND_RUN_MODE_VALUE=docker"
  )
)
echo AUTH_MODE=%AUTH_MODE_VALUE%
echo BACKEND_RUN_MODE=%BACKEND_RUN_MODE_VALUE%
echo FRONTEND_RUN_MODE=%FRONTEND_RUN_MODE_VALUE%
if /I "%AUTH_MODE_VALUE%"=="env" (
  if "%WECHAT_COOKIE%"=="" echo Hint: AUTH_MODE=env requires WECHAT_COOKIE
  if "%WECHAT_TOKEN%"=="" echo Hint: AUTH_MODE=env requires WECHAT_TOKEN
)
call :ensure_local_python_runtime
if errorlevel 1 exit /b 1

if /I "%BACKEND_RUN_MODE_VALUE%"=="local" (
  call :stop_backend_container
  call :start_local_backend
  if errorlevel 1 exit /b 1
  if /I "%FRONTEND_RUN_MODE_VALUE%"=="local" (
    call :start_local_frontend
    if errorlevel 1 exit /b 1
    goto :after_start
  )
  if not "%FRONTEND_NODE_IMAGE%"=="" if not "%FRONTEND_NGINX_IMAGE%"=="" (
    call :try_start_frontend_local "%FRONTEND_NODE_IMAGE%" "%FRONTEND_NGINX_IMAGE%" "custom image"
    if errorlevel 1 exit /b 1
    goto :after_start
  )
  call :try_start_frontend_local "docker.1ms.run/library/node:20-alpine" "docker.1ms.run/library/nginx:1.27-alpine" "mirror 1"
  if not errorlevel 1 goto :after_start
  call :try_start_frontend_local "node:20-alpine" "nginx:1.27-alpine" "mirror 2"
  if not errorlevel 1 goto :after_start
  echo.
  echo All configured image sources failed.
  echo You can manually set images and retry:
  echo set FRONTEND_NODE_IMAGE=your_available_node_image
  echo set FRONTEND_NGINX_IMAGE=your_available_nginx_image
  echo scripts\start.bat
  exit /b 1
)

set "VITE_API_BASE_URL="

if not "%FRONTEND_NODE_IMAGE%"=="" if not "%FRONTEND_NGINX_IMAGE%"=="" (
  call :try_start "%FRONTEND_NODE_IMAGE%" "%FRONTEND_NGINX_IMAGE%" "custom image"
  if errorlevel 1 exit /b 1
  goto :after_start
)

call :try_start "docker.1ms.run/library/node:20-alpine" "docker.1ms.run/library/nginx:1.27-alpine" "mirror 1"
if not errorlevel 1 goto :after_start
call :try_start "node:20-alpine" "nginx:1.27-alpine" "mirror 2"
if not errorlevel 1 goto :after_start

echo.
echo All configured image sources failed.
echo You can manually set images and retry:
echo set FRONTEND_NODE_IMAGE=your_available_node_image
echo set FRONTEND_NGINX_IMAGE=your_available_nginx_image
echo scripts\start.bat
exit /b 1

:after_start
docker compose ps
if errorlevel 1 exit /b 1

echo Frontend: http://localhost:8080
echo Backend:  http://localhost:8000

if "%AUTO_OPEN_BROWSER%"=="" set "AUTO_OPEN_BROWSER=1"
if /I "%AUTO_OPEN_BROWSER%"=="0" (
  echo AUTO_OPEN_BROWSER=0, skip opening browser.
) else (
  call :open_browser "http://localhost:8080"
)
exit /b 0

:try_start
set "FRONTEND_NODE_IMAGE=%~1"
set "FRONTEND_NGINX_IMAGE=%~2"
echo.
echo Trying %~3
echo FRONTEND_NODE_IMAGE=%FRONTEND_NODE_IMAGE%
echo FRONTEND_NGINX_IMAGE=%FRONTEND_NGINX_IMAGE%
docker compose up -d --build
if errorlevel 1 (
  echo Current image source failed. Retrying with next source...
  exit /b 1
)
exit /b 0

:try_start_frontend_local
set "FRONTEND_NODE_IMAGE=%~1"
set "FRONTEND_NGINX_IMAGE=%~2"
set "VITE_API_BASE_URL=http://localhost:8000"
echo.
echo Trying %~3 ^(frontend with local backend^)
echo FRONTEND_NODE_IMAGE=%FRONTEND_NODE_IMAGE%
echo FRONTEND_NGINX_IMAGE=%FRONTEND_NGINX_IMAGE%
echo VITE_API_BASE_URL=%VITE_API_BASE_URL%
docker compose up -d --build --no-deps frontend
if errorlevel 1 (
  echo Current image source failed. Retrying with next source...
  exit /b 1
)
exit /b 0

:ensure_local_python_runtime
if /I "%SKIP_LOCAL_PY_SETUP%"=="1" (
  echo SKIP_LOCAL_PY_SETUP=1, skip local python setup.
  exit /b 0
)
set "PYTHON_CMD="
where py >nul 2>&1 && py -3 -V >nul 2>&1 && set "PYTHON_CMD=py -3"
if "%PYTHON_CMD%"=="" (
  where python >nul 2>&1 && python -V >nul 2>&1 && set "PYTHON_CMD=python"
)
if "%PYTHON_CMD%"=="" (
  where python3 >nul 2>&1 && python3 -V >nul 2>&1 && set "PYTHON_CMD=python3"
)
if "%PYTHON_CMD%"=="" (
  echo Python command not found in PATH ^(checked: py -3, python, python3^). Skip local python setup.
  exit /b 0
)
%PYTHON_CMD% -c "import fastapi,uvicorn,sqlalchemy,requests,bs4,lxml,playwright; from playwright.sync_api import sync_playwright; p=sync_playwright().start(); import os,sys; path=p.chromium.executable_path; p.stop(); sys.exit(0 if os.path.exists(path) else 1)" >nul 2>&1
if not errorlevel 1 (
  echo Local python runtime already ready.
  exit /b 0
)
echo Installing local python dependencies...
%PYTHON_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
  echo Local python setup failed at requirements.txt
  exit /b 1
)
%PYTHON_CMD% -m pip install -r backend\requirements.txt
if errorlevel 1 (
  echo Local python setup failed at backend/requirements.txt
  exit /b 1
)

call :resolve_playwright_install_need
if /I "%INSTALL_PLAYWRIGHT_BROWSER%"=="0" (
  echo Skipping Playwright browser install ^(%PLAYWRIGHT_INSTALL_SKIP_REASON%^).
  echo Local python runtime setup completed.
  exit /b 0
)
if not exist output mkdir output
set "PLAYWRIGHT_INSTALL_LOG=output\playwright-install.log"
if exist "%PLAYWRIGHT_INSTALL_LOG%" del /q "%PLAYWRIGHT_INSTALL_LOG%" >nul 2>&1

echo Playwright install log: %PLAYWRIGHT_INSTALL_LOG%
if "%PLAYWRIGHT_DOWNLOAD_HOST%"=="" (
  call :try_install_playwright_with_host "https://npmmirror.com/mirrors/playwright" "mirror host"
  if errorlevel 1 (
    call :try_install_playwright_with_host "https://registry.npmmirror.com/-/binary/playwright" "mirror host backup"
    if errorlevel 1 (
      call :try_install_playwright_with_host "" "official host"
      if errorlevel 1 (
        echo Local python setup failed at playwright browser install. Check %PLAYWRIGHT_INSTALL_LOG%
        exit /b 1
      )
    )
  )
) else (
  call :try_install_playwright_with_host "%PLAYWRIGHT_DOWNLOAD_HOST%" "custom host"
  if errorlevel 1 (
    echo Custom PLAYWRIGHT_DOWNLOAD_HOST failed. Fallback to mirror host...
    call :try_install_playwright_with_host "https://npmmirror.com/mirrors/playwright" "mirror host"
    if errorlevel 1 (
      call :try_install_playwright_with_host "https://registry.npmmirror.com/-/binary/playwright" "mirror host backup"
      if errorlevel 1 (
        call :try_install_playwright_with_host "" "official host"
        if errorlevel 1 (
          echo Local python setup failed at playwright browser install. Check %PLAYWRIGHT_INSTALL_LOG%
          exit /b 1
        )
      )
    )
  )
)

echo Local python runtime setup completed.
exit /b 0

:resolve_playwright_install_need
set "INSTALL_PLAYWRIGHT_BROWSER=1"
set "PLAYWRIGHT_INSTALL_SKIP_REASON=required for current auth mode"
if /I "%AUTH_MODE_VALUE%"=="env" (
  set "INSTALL_PLAYWRIGHT_BROWSER=0"
  set "PLAYWRIGHT_INSTALL_SKIP_REASON=AUTH_MODE=env"
  exit /b 0
)
if /I "%AUTH_MODE_VALUE%"=="auto" if not "%WECHAT_COOKIE%"=="" if not "%WECHAT_TOKEN%"=="" (
  set "INSTALL_PLAYWRIGHT_BROWSER=0"
  set "PLAYWRIGHT_INSTALL_SKIP_REASON=credentials already provided"
  exit /b 0
)
exit /b 0

:start_local_backend
call :stop_local_backend
if not exist output mkdir output
set "AUTH_MODE=%AUTH_MODE_VALUE%"
set "LOCAL_BACKEND_CMD=cd /d ""%cd%"" && %PYTHON_CMD% -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 >> output\local-backend.log 2>&1"
start "news-fetch-local-backend" /min cmd /c "%LOCAL_BACKEND_CMD%"
if errorlevel 1 (
  echo Failed to start local backend process.
  exit /b 1
)
call :wait_local_backend_ready
if errorlevel 1 exit /b 1
echo Local backend started in separate process.
exit /b 0

:stop_backend_container
docker compose stop backend >nul 2>&1
docker compose rm -f backend >nul 2>&1
exit /b 0

:stop_local_backend
taskkill /FI "WINDOWTITLE eq news-fetch-local-backend" /T /F >nul 2>&1
exit /b 0

:start_local_frontend
call :stop_local_frontend
if not exist output mkdir output
where npm >nul 2>&1
if errorlevel 1 (
  echo npm command not found in PATH. Please install Node.js 20+.
  exit /b 1
)
if not exist frontend\node_modules (
  echo Installing frontend dependencies...
  call npm --prefix frontend install
  if errorlevel 1 (
    echo Failed to install frontend dependencies.
    exit /b 1
  )
)
set "LOCAL_FRONTEND_CMD=cd /d ""%cd%\frontend"" && set VITE_API_BASE_URL=http://localhost:8000&& npm run dev -- --host 0.0.0.0 --port 8080 >> ..\output\local-frontend.log 2>&1"
start "news-fetch-local-frontend" /min cmd /c "%LOCAL_FRONTEND_CMD%"
if errorlevel 1 (
  echo Failed to start local frontend process.
  exit /b 1
)
call :wait_local_frontend_ready
if errorlevel 1 exit /b 1
echo Local frontend started in separate process.
exit /b 0

:stop_local_frontend
taskkill /FI "WINDOWTITLE eq news-fetch-local-frontend" /T /F >nul 2>&1
exit /b 0

:wait_local_backend_ready
for /L %%I in (1,1,25) do (
  %PYTHON_CMD% -c "import urllib.request,sys,json; d=json.loads(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).read().decode('utf-8')); sys.exit(0 if d.get('status')=='ok' else 1)" >nul 2>&1
  if not errorlevel 1 exit /b 0
  timeout /t 1 /nobreak >nul
)
echo Local backend health check failed. Please check output\local-backend.log
exit /b 1

:wait_local_frontend_ready
for /L %%I in (1,1,30) do (
  %PYTHON_CMD% -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:8080', timeout=2); sys.exit(0)" >nul 2>&1
  if not errorlevel 1 exit /b 0
  timeout /t 1 /nobreak >nul
)
echo Local frontend health check failed. Please check output\local-frontend.log
exit /b 1

:try_install_playwright_with_host
if "%PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT%"=="" set "PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=120000"
if "%~1"=="" (
  set "PLAYWRIGHT_DOWNLOAD_HOST="
  echo Installing Chromium via official host...
) else (
  set "PLAYWRIGHT_DOWNLOAD_HOST=%~1"
  echo Installing Chromium via %~2: %PLAYWRIGHT_DOWNLOAD_HOST%
)
echo ===== [%date% %time%] Installing via %~2 =====>> "%PLAYWRIGHT_INSTALL_LOG%"
if not "%PLAYWRIGHT_DOWNLOAD_HOST%"=="" echo PLAYWRIGHT_DOWNLOAD_HOST=%PLAYWRIGHT_DOWNLOAD_HOST%>> "%PLAYWRIGHT_INSTALL_LOG%"
echo PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=%PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT%>> "%PLAYWRIGHT_INSTALL_LOG%"
call %PYTHON_CMD% -m playwright install chromium >> "%PLAYWRIGHT_INSTALL_LOG%" 2>&1
if errorlevel 1 (
  echo Chromium install failed via %~2. Check %PLAYWRIGHT_INSTALL_LOG%
  exit /b 1
)
exit /b 0

:open_browser
echo Opening browser: %~1
start "" "%~1"
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%~1'" >nul 2>&1
)
exit /b 0
