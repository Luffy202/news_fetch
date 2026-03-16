#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

echo "请选择登录模式："
echo "1) auto（默认，优先环境变量，缺失则尝试 Playwright）"
echo "2) env（仅环境变量）"
echo "3) playwright（仅扫码登录）"
read -r -p "输入 1/2/3，直接回车默认 1: " MODE_CHOICE

case "${MODE_CHOICE:-1}" in
  2)
    export AUTH_MODE=env
    read -r -p "请输入 WECHAT_COOKIE: " WECHAT_COOKIE_INPUT
    read -r -p "请输入 WECHAT_TOKEN: " WECHAT_TOKEN_INPUT
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
echo "启动完成，按回车键关闭窗口。"
read -r
