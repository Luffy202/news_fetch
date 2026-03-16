@echo off
setlocal
cd /d "%~dp0\.."

set "AUTH_MODE_VALUE=%AUTH_MODE%"
if "%AUTH_MODE_VALUE%"=="" set "AUTH_MODE_VALUE=auto"
echo AUTH_MODE=%AUTH_MODE_VALUE%
if /I "%AUTH_MODE_VALUE%"=="env" (
  if "%WECHAT_COOKIE%"=="" echo 提示: AUTH_MODE=env 需要设置 WECHAT_COOKIE
  if "%WECHAT_TOKEN%"=="" echo 提示: AUTH_MODE=env 需要设置 WECHAT_TOKEN
)

docker compose up -d --build
if errorlevel 1 exit /b 1
docker compose ps
if errorlevel 1 exit /b 1

echo Frontend: http://localhost:8080
echo Backend:  http://localhost:8000

if "%AUTO_OPEN_BROWSER%"=="" set "AUTO_OPEN_BROWSER=1"
if not "%AUTO_OPEN_BROWSER%"=="0" start "" "http://localhost:8080"
