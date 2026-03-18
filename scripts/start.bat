@echo off
setlocal
cd /d "%~dp0\.."

set "AUTH_MODE_VALUE=%AUTH_MODE%"
if "%AUTH_MODE_VALUE%"=="" set "AUTH_MODE_VALUE=auto"
echo AUTH_MODE=%AUTH_MODE_VALUE%
if /I "%AUTH_MODE_VALUE%"=="env" (
  if "%WECHAT_COOKIE%"=="" echo Hint: AUTH_MODE=env requires WECHAT_COOKIE
  if "%WECHAT_TOKEN%"=="" echo Hint: AUTH_MODE=env requires WECHAT_TOKEN
)
call :ensure_local_python_runtime
if errorlevel 1 exit /b 1

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

if "%PLAYWRIGHT_DOWNLOAD_HOST%"=="" (
  call :try_install_playwright_with_host "https://npmmirror.com/mirrors/playwright" "mirror host"
  if errorlevel 1 (
    call :try_install_playwright_with_host "https://registry.npmmirror.com/-/binary/playwright" "mirror host backup"
    if errorlevel 1 (
      call :try_install_playwright_with_host "" "official host"
      if errorlevel 1 (
        echo Local python setup failed at playwright browser install
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
          echo Local python setup failed at playwright browser install
          exit /b 1
        )
      )
    )
  )
)

echo Local python runtime setup completed.
exit /b 0

:try_install_playwright_with_host
if "%~1"=="" (
  set "PLAYWRIGHT_DOWNLOAD_HOST="
  echo Installing Chromium via official host...
) else (
  set "PLAYWRIGHT_DOWNLOAD_HOST=%~1"
  echo Installing Chromium via %~2: %PLAYWRIGHT_DOWNLOAD_HOST%
)
%PYTHON_CMD% -m playwright install chromium
if errorlevel 1 (
  echo Chromium install failed via %~2.
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
