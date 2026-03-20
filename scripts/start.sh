#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

AUTH_MODE_VALUE="${AUTH_MODE:-auto}"
BACKEND_RUN_MODE_VALUE="${BACKEND_RUN_MODE:-local}"
STARTUP_ERROR_LOG="output/startup-error.log"
LOCAL_BACKEND_LOG="output/local-backend.log"
APP_URL_LOCAL="http://localhost:8000"
APP_URL_DOCKER="http://localhost:8080"

write_startup_error() {
  mkdir -p output
  printf '%s\n' "$1" > "${STARTUP_ERROR_LOG}"
}

clear_startup_error() {
  mkdir -p output
  rm -f "${STARTUP_ERROR_LOG}"
}

open_browser() {
  local target_url="$1"
  if [[ "${AUTO_OPEN_BROWSER:-1}" == "0" ]]; then
    return
  fi
  if command -v open >/dev/null 2>&1; then
    open "${target_url}" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${target_url}" >/dev/null 2>&1 || true
  fi
}

find_python() {
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
  elif command -v py >/dev/null 2>&1; then
    PYTHON_CMD="py -3"
  else
    write_startup_error "未找到可用的 Python 命令（python3 / python / py -3）。"
    echo "未找到可用的 Python 命令（python3 / python / py -3）。"
    exit 1
  fi
}

needs_playwright_browser() {
  if [[ "${AUTH_MODE_VALUE}" == "env" ]]; then
    return 1
  fi
  if [[ "${AUTH_MODE_VALUE}" == "auto" ]] && [[ -n "${WECHAT_COOKIE:-}" ]] && [[ -n "${WECHAT_TOKEN:-}" ]]; then
    return 1
  fi
  return 0
}

ensure_local_python_runtime() {
  find_python

  if ! eval "${PYTHON_CMD} -c \"import fastapi,uvicorn,sqlalchemy,requests,bs4,lxml,playwright\"" >/dev/null 2>&1; then
    echo "正在安装 Python 依赖..."
    eval "${PYTHON_CMD} -m pip install -r requirements.txt"
    eval "${PYTHON_CMD} -m pip install -r backend/requirements.txt"
  fi

  if needs_playwright_browser; then
    if ! eval "${PYTHON_CMD} -c \"from playwright.sync_api import sync_playwright; p=sync_playwright().start(); import os,sys; path=p.chromium.executable_path; p.stop(); sys.exit(0 if os.path.exists(path) else 1)\"" >/dev/null 2>&1; then
      echo "正在安装 Playwright Chromium..."
      eval "${PYTHON_CMD} -m playwright install chromium"
    fi
  fi
}

frontend_needs_build() {
  if [[ ! -f "frontend/dist/index.html" ]]; then
    return 0
  fi
  if find frontend/src frontend/index.html frontend/package.json frontend/package-lock.json -type f -newer frontend/dist/index.html | grep -q .; then
    return 0
  fi
  return 1
}

ensure_frontend_dist() {
  if [[ "${SKIP_FRONTEND_BUILD:-0}" == "1" ]]; then
    return
  fi

  if ! frontend_needs_build; then
    return
  fi

  if ! command -v npm >/dev/null 2>&1; then
    write_startup_error "未检测到 npm，无法构建前端页面。请先安装 Node.js。"
    echo "未检测到 npm，无法构建前端页面。请先安装 Node.js。"
    exit 1
  fi

  echo "正在构建前端静态资源..."
  if [[ ! -d "frontend/node_modules" ]]; then
    (cd frontend && npm install)
  fi
  (cd frontend && npm run build)
}

is_backend_healthy() {
  eval "${PYTHON_CMD} -c \"import sys, urllib.request; \
response = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); \
sys.exit(0 if response.status == 200 else 1)\"" >/dev/null 2>&1
}

port_8000_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  return 1
}

stop_local_backend() {
  if [[ -f ".local_backend.pid" ]]; then
    LOCAL_BACKEND_PID="$(cat .local_backend.pid || true)"
    if [[ -n "${LOCAL_BACKEND_PID}" ]] && kill -0 "${LOCAL_BACKEND_PID}" >/dev/null 2>&1; then
      kill "${LOCAL_BACKEND_PID}" >/dev/null 2>&1 || true
      sleep 1
    fi
    rm -f .local_backend.pid
  fi
  pkill -f "uvicorn backend.app:app" >/dev/null 2>&1 || true
}

start_local_backend() {
  mkdir -p output
  stop_local_backend
  nohup env \
    AUTH_MODE="${AUTH_MODE_VALUE}" \
    BACKEND_RUN_MODE=local \
    WECHAT_COOKIE="${WECHAT_COOKIE:-}" \
    WECHAT_TOKEN="${WECHAT_TOKEN:-}" \
    KIMI_API_KEY="${KIMI_API_KEY:-}" \
    FEISHU_WEBHOOK="${FEISHU_WEBHOOK:-}" \
    ${PYTHON_CMD} -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 > "${LOCAL_BACKEND_LOG}" 2>&1 &
  echo "$!" > .local_backend.pid

  for _ in $(seq 1 60); do
    if is_backend_healthy; then
      return
    fi
    sleep 1
  done

  write_startup_error "本地后端启动失败，请查看 ${LOCAL_BACKEND_LOG}。"
  echo "本地后端启动失败，请查看 ${LOCAL_BACKEND_LOG}。"
  exit 1
}

start_docker_stack() {
  clear_startup_error
  docker compose up -d --build
  echo "Frontend: ${APP_URL_DOCKER}"
  echo "Backend:  ${APP_URL_LOCAL}"
  open_browser "${APP_URL_DOCKER}"
}

start_local_stack() {
  ensure_local_python_runtime
  ensure_frontend_dist

  if is_backend_healthy; then
    clear_startup_error
    echo "本地服务已在运行，直接打开工作台。"
    echo "Frontend: ${APP_URL_LOCAL}"
    echo "Backend:  ${APP_URL_LOCAL}"
    open_browser "${APP_URL_LOCAL}"
    return
  fi

  if port_8000_in_use; then
    write_startup_error "端口 8000 已被其他程序占用，请先释放该端口后重试。"
    echo "端口 8000 已被其他程序占用，请先释放该端口后重试。"
    exit 1
  fi

  clear_startup_error
  start_local_backend

  echo "Frontend: ${APP_URL_LOCAL}"
  echo "Backend:  ${APP_URL_LOCAL}"
  open_browser "${APP_URL_LOCAL}"
}

echo "AUTH_MODE=${AUTH_MODE_VALUE}"
echo "BACKEND_RUN_MODE=${BACKEND_RUN_MODE_VALUE}"

if [[ "${BACKEND_RUN_MODE_VALUE}" == "docker" ]]; then
  start_docker_stack
else
  start_local_stack
fi
