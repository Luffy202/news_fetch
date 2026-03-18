@echo off
setlocal
cd /d "%~dp0\.."

docker compose down
taskkill /FI "WINDOWTITLE eq news-fetch-local-backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq news-fetch-local-frontend" /T /F >nul 2>&1
