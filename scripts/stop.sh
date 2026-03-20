#!/usr/bin/env bash
set -euo pipefail

docker compose down

if [[ -f ".local_backend.pid" ]]; then
  LOCAL_BACKEND_PID="$(cat .local_backend.pid || true)"
  if [[ -n "${LOCAL_BACKEND_PID}" ]] && kill -0 "${LOCAL_BACKEND_PID}" >/dev/null 2>&1; then
    kill "${LOCAL_BACKEND_PID}" >/dev/null 2>&1 || true
  fi
  rm -f .local_backend.pid
fi

pkill -f "uvicorn backend.app:app" >/dev/null 2>&1 || true
