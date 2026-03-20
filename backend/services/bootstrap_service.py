from __future__ import annotations

import os
from pathlib import Path

from backend import runtime_config
from backend.services.wechat_auth import get_playwright_status


BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST_DIR = BASE_DIR / 'frontend' / 'dist'
STARTUP_ERROR_PATH = BASE_DIR / 'output' / 'startup-error.log'


class BootstrapService:
    def get_status(self) -> dict:
        playwright_status = get_playwright_status()
        frontend_dist_ready = (FRONTEND_DIST_DIR / 'index.html').exists()
        run_mode = self._resolve_run_mode()
        blocking_issues: list[str] = []

        if not frontend_dist_ready and run_mode == 'local':
            blocking_issues.append('前端静态资源尚未构建，启动脚本会在本地模式下自动构建。')
        if runtime_config.AUTH_MODE == 'playwright' and not playwright_status['canVisualLogin']:
            blocking_issues.append(playwright_status['visualLoginMessage'])
        if (
            runtime_config.AUTH_MODE == 'playwright'
            or (
                runtime_config.AUTH_MODE == 'auto'
                and not (runtime_config.COOKIE and runtime_config.TOKEN)
            )
        ) and not playwright_status['playwrightInstalled']:
            blocking_issues.append('未检测到 Playwright 依赖，扫码登录暂不可用。')

        last_startup_error = None
        if STARTUP_ERROR_PATH.exists():
            content = STARTUP_ERROR_PATH.read_text(encoding='utf-8').strip()
            if content:
                last_startup_error = content

        if blocking_issues:
            message = blocking_issues[0]
        elif run_mode == 'docker':
            message = '当前为 Docker 模式，前端默认由 8080 端口提供服务。'
        else:
            message = '环境检查完成，可以继续登录并开始抓取。'

        return {
            'runMode': run_mode,
            'authMode': runtime_config.AUTH_MODE,
            'frontendHosted': frontend_dist_ready,
            'frontendDistReady': frontend_dist_ready,
            'playwrightInstalled': playwright_status['playwrightInstalled'],
            'canVisualLogin': playwright_status['canVisualLogin'],
            'visualLoginMessage': playwright_status['visualLoginMessage'],
            'apiBasePath': '/api',
            'blockingIssues': blocking_issues,
            'lastStartupError': last_startup_error,
            'message': message,
        }

    def _resolve_run_mode(self) -> str:
        configured = (os.getenv('BACKEND_RUN_MODE', '').strip() or '').lower()
        if configured in {'local', 'docker'}:
            return configured
        if Path('/.dockerenv').exists():
            return 'docker'
        return 'local'
