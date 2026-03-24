#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"
OPENCLAW_CONFIG="${OPENCLAW_CONFIG:-$OPENCLAW_HOME/openclaw.json}"
OPENCLAW_INSTALL_URL="${OPENCLAW_INSTALL_URL:-https://openclaw.im/install.sh}"
OPENCLAW_REPO_ALIAS="${OPENCLAW_REPO_ALIAS:-news_fetch}"
NEWS_FETCH_BASE_URL="${NEWS_FETCH_BASE_URL:-http://127.0.0.1:8000}"
SKIP_OPENCLAW_INSTALL="${SKIP_OPENCLAW_INSTALL:-0}"
SKILL_NAME="news-fetch-flow"
SKILL_SOURCE="${REPO_ROOT}/skills/${SKILL_NAME}"
SKILL_TARGET_DIR="${OPENCLAW_WORKSPACE}/skills"
SKILL_TARGET="${SKILL_TARGET_DIR}/${SKILL_NAME}"
PROJECTS_DIR="${OPENCLAW_WORKSPACE}/projects"
PROJECT_TARGET="${PROJECTS_DIR}/${OPENCLAW_REPO_ALIAS}"

log_step() {
  printf '\n==> %s\n' "$1"
}

log_info() {
  printf '    %s\n' "$1"
}

die() {
  printf '错误：%s\n' "$1" >&2
  exit 1
}

have_command() {
  command -v "$1" >/dev/null 2>&1
}

ensure_skill_source() {
  [[ -d "${SKILL_SOURCE}" ]] || die "未找到 skill 源目录：${SKILL_SOURCE}"
  [[ -f "${REPO_ROOT}/README.md" ]] || die "未找到 README：${REPO_ROOT}/README.md"
}

install_openclaw_if_needed() {
  if have_command openclaw; then
    log_info "已检测到 openclaw：$(command -v openclaw)"
    return
  fi

  [[ "${SKIP_OPENCLAW_INSTALL}" == "0" ]] || die "当前未安装 openclaw，且 SKIP_OPENCLAW_INSTALL=1，无法继续。"
  have_command curl || die "未检测到 curl，无法自动安装 OpenClaw。"

  log_step "未检测到 openclaw，开始执行官方安装脚本"
  log_info "安装脚本地址：${OPENCLAW_INSTALL_URL}"
  bash -lc "curl -fsSL '${OPENCLAW_INSTALL_URL}' | bash"
  hash -r

  have_command openclaw || die "OpenClaw 安装完成后仍未找到 openclaw 命令，请确认你的 shell PATH。"
}

setup_openclaw_workspace() {
  log_step "确保 OpenClaw 工作区已初始化"
  mkdir -p "${OPENCLAW_WORKSPACE}"
  openclaw setup --workspace "${OPENCLAW_WORKSPACE}"
  mkdir -p "${SKILL_TARGET_DIR}" "${PROJECTS_DIR}"
  log_info "OpenClaw 配置：${OPENCLAW_CONFIG}"
  log_info "OpenClaw 工作区：${OPENCLAW_WORKSPACE}"
}

link_path() {
  local source="$1"
  local target="$2"
  local label="$3"

  if [[ -L "${target}" ]]; then
    local current
    current="$(readlink "${target}" || true)"
    if [[ "${current}" == "${source}" ]]; then
      log_info "${label} 已就绪：${target}"
      return
    fi
    rm -f "${target}"
  elif [[ -e "${target}" ]]; then
    local backup="${target}.bak.$(date +%Y%m%d%H%M%S)"
    mv "${target}" "${backup}"
    log_info "已备份现有 ${label}：${backup}"
  fi

  ln -s "${source}" "${target}"
  log_info "${label} 已挂载：${target} -> ${source}"
}

mount_skill_and_repo() {
  log_step "挂载仓库 skill 与项目目录"
  link_path "${SKILL_SOURCE}" "${SKILL_TARGET}" "OpenClaw skill"
  link_path "${REPO_ROOT}" "${PROJECT_TARGET}" "项目目录"
}

check_news_fetch_backend() {
  log_step "检查 news_fetch 本地服务"
  if have_command curl && curl -fsS "${NEWS_FETCH_BASE_URL}/health" >/dev/null 2>&1; then
    log_info "本地服务可达：${NEWS_FETCH_BASE_URL}"
    return
  fi

  log_info "当前未检测到 ${NEWS_FETCH_BASE_URL} 在线。"
  log_info "需要时先运行：bash ${REPO_ROOT}/scripts/start.sh"
}

print_next_steps() {
  cat <<EOF

对接完成。

关键路径：
- OpenClaw 工作区：${OPENCLAW_WORKSPACE}
- Skill 挂载路径：${SKILL_TARGET}
- 项目挂载路径：${PROJECT_TARGET}

下一步建议：
1. 启动你的 news_fetch 服务：bash ${REPO_ROOT}/scripts/start.sh
2. 打开 OpenClaw 控制台：openclaw dashboard
3. 在 OpenClaw 中让它先阅读：
   ${PROJECT_TARGET}/README.md
4. 然后直接对 OpenClaw 说：
   请先阅读 README 里的“OpenClaw 一键对接”章节，再检查 http://127.0.0.1:8000 服务状态，并使用 news_fetch_flow skill 协助我完成登录、添加公众号和启动抓取。

如需自定义：
- 自定义工作区：OPENCLAW_WORKSPACE=/path/to/workspace bash scripts/setup_openclaw.sh
- 只重挂载不自动安装：SKIP_OPENCLAW_INSTALL=1 bash scripts/setup_openclaw.sh
- 自定义项目别名：OPENCLAW_REPO_ALIAS=my_news_fetch bash scripts/setup_openclaw.sh
EOF
}

main() {
  ensure_skill_source
  install_openclaw_if_needed
  setup_openclaw_workspace
  mount_skill_and_repo
  check_news_fetch_backend
  print_next_steps
}

main "$@"
