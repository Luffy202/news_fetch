#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Select backend run mode:"
echo "1) docker (default, both frontend/backend in containers)"
echo "2) local (backend on host, frontend in container)"
read -r -p "Enter 1/2, default is 1: " BACKEND_MODE_CHOICE
case "${BACKEND_MODE_CHOICE:-1}" in
  2)
    export BACKEND_RUN_MODE=local
    ;;
  *)
    export BACKEND_RUN_MODE=docker
    ;;
esac

echo "Select login mode:"
echo "1) auto (default, env first, fallback to Playwright)"
echo "2) env (env only)"
echo "3) playwright (QR login only)"
read -r -p "Enter 1/2/3, default is 1: " MODE_CHOICE

case "${MODE_CHOICE:-1}" in
  2)
    export AUTH_MODE=env
    read -r -p "Please enter WECHAT_COOKIE: " WECHAT_COOKIE_INPUT
    read -r -p "Please enter WECHAT_TOKEN: " WECHAT_TOKEN_INPUT
    export WECHAT_COOKIE="${WECHAT_COOKIE_INPUT}"
    export WECHAT_TOKEN="${WECHAT_TOKEN_INPUT}"
    ;;
  3)
    export AUTH_MODE=playwright
    ;;
  *)
    export AUTH_MODE=auto
    ;;
esac

bash scripts/start.sh
echo ""
echo "Startup finished. Press Enter to close."
read -r
