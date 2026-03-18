#!/usr/bin/env bash
set -euo pipefail

AUTH_MODE_VALUE="${AUTH_MODE:-auto}"
BACKEND_RUN_MODE_VALUE="${BACKEND_RUN_MODE:-docker}"
echo "AUTH_MODE=${AUTH_MODE_VALUE}"
echo "BACKEND_RUN_MODE=${BACKEND_RUN_MODE_VALUE}"
if [[ "${AUTH_MODE_VALUE}" == "env" ]] && ([[ -z "${WECHAT_COOKIE:-}" ]] || [[ -z "${WECHAT_TOKEN:-}" ]]); then
  echo "提示: AUTH_MODE=env 需要同时设置 WECHAT_COOKIE 和 WECHAT_TOKEN"
fi

if [[ "${BACKEND_RUN_MODE_VALUE}" == "local" ]]; then
  bash scripts/stop.sh >/dev/null 2>&1 || true
  if [[ -f ".local_backend.pid" ]]; then
    OLD_PID="$(cat .local_backend.pid || true)"
    if [[ -n "${OLD_PID}" ]] && kill -0 "${OLD_PID}" >/dev/null 2>&1; then
      kill "${OLD_PID}" >/dev/null 2>&1 || true
      sleep 1
    fi
    rm -f .local_backend.pid
  fi
  if command -v py >/dev/null 2>&1; then
    PYTHON_CMD="py -3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
  else
    echo "未找到可用 Python 命令（py -3 / python / python3）"
    exit 1
  fi
  mkdir -p output
  nohup env AUTH_MODE="${AUTH_MODE_VALUE}" WECHAT_COOKIE="${WECHAT_COOKIE:-}" WECHAT_TOKEN="${WECHAT_TOKEN:-}" ${PYTHON_CMD} -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 > output/local-backend.log 2>&1 &
  LOCAL_BACKEND_PID=$!
  echo "${LOCAL_BACKEND_PID}" > .local_backend.pid
  export VITE_API_BASE_URL="http://localhost:8000"
  docker compose up -d --build --no-deps frontend
else
  unset VITE_API_BASE_URL
  docker compose up -d --build
fi
docker compose ps

echo "Frontend: http://localhost:8080"
echo "Backend:  http://localhost:8000"

AUTO_OPEN_BROWSER_VALUE="${AUTO_OPEN_BROWSER:-1}"
if [[ "${AUTO_OPEN_BROWSER_VALUE}" != "0" ]]; then
  if command -v open >/dev/null 2>&1; then
    open "http://localhost:8080"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:8080" >/dev/null 2>&1 || true
  fi
fi
