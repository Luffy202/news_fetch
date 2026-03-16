#!/usr/bin/env bash
set -euo pipefail

AUTH_MODE_VALUE="${AUTH_MODE:-auto}"
echo "AUTH_MODE=${AUTH_MODE_VALUE}"
if [[ "${AUTH_MODE_VALUE}" == "env" ]] && ([[ -z "${WECHAT_COOKIE:-}" ]] || [[ -z "${WECHAT_TOKEN:-}" ]]); then
  echo "提示: AUTH_MODE=env 需要同时设置 WECHAT_COOKIE 和 WECHAT_TOKEN"
fi

docker compose up -d --build
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
