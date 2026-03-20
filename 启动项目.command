#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

export BACKEND_RUN_MODE="${BACKEND_RUN_MODE:-local}"
export AUTH_MODE="${AUTH_MODE:-auto}"

bash scripts/start.sh

echo ""
echo "启动流程结束。关闭此窗口不会影响后台服务运行。"
echo "按回车键关闭窗口。"
read -r
