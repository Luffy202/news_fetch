@echo off
setlocal
cd /d "%~dp0\.."

docker compose down
taskkill /FI "WINDOWTITLE eq news-fetch-local-backend" /T /F >nul 2>&1
