#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

bash scripts/stop.sh
echo ""
echo "服务已停止，按回车键关闭窗口。"
read -r
