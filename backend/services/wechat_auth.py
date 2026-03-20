from __future__ import annotations

import importlib.util
import os
import re
import subprocess
import sys
from pathlib import Path

from backend import runtime_config


class AuthError(Exception):
    pass


def _notify(progress_callback, status: str, message: str) -> None:
    if progress_callback is not None:
        progress_callback(status, message)


def _extract_token(page):
    match = re.search(r'token=(\d+)', page.url)
    if not match:
        raise AuthError('无法从 URL 中提取 token')
    return match.group(1)


def _extract_cookie(context):
    cookies = context.cookies('https://mp.weixin.qq.com')
    if not cookies:
        raise AuthError('无法获取 cookie，cookie 列表为空')
    return '; '.join(f"{cookie['name']}={cookie['value']}" for cookie in cookies)


def _get_credentials_from_env(progress_callback=None):
    _notify(progress_callback, 'verifying', '检测到环境变量凭证，正在校验...')
    cookie = runtime_config.COOKIE.strip()
    token = runtime_config.TOKEN.strip()
    if not cookie or not token:
        raise AuthError('未检测到环境变量凭证，请设置 WECHAT_COOKIE 和 WECHAT_TOKEN')
    return {'cookie': cookie, 'token': token}


def _install_playwright_chromium():
    command = [sys.executable, '-m', 'playwright', 'install', 'chromium']
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode == 0:
        return True
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.stderr.strip():
        print(result.stderr.strip())
    return False


def _get_credentials_from_playwright(auto_install_browser: bool = True, progress_callback=None):
    try:
        from playwright.sync_api import Error as PlaywrightError, TimeoutError as PwTimeout, sync_playwright
    except ModuleNotFoundError as exc:
        if exc.name == 'playwright':
            raise AuthError(
                '后端未安装 Playwright，请先执行 `pip install -r backend/requirements.txt`，然后执行 `python -m playwright install chromium`'
            ) from exc
        raise

    user_data_dir = str(Path(__file__).resolve().parents[2] / 'browser_data')

    _notify(progress_callback, 'launching_browser', '正在启动微信登录窗口...')
    print('正在启动浏览器...')

    try:
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(
                user_data_dir,
                headless=False,
                args=['--disable-blink-features=AutomationControlled'],
            )
            page = context.pages[0] if context.pages else context.new_page()
            page.goto('https://mp.weixin.qq.com/')

            if 'cgi-bin/home' in page.url and 'token=' in page.url:
                _notify(progress_callback, 'verifying', '检测到已有登录态，正在校验凭证...')
                print('检测到已有登录状态，无需重新扫码')
            else:
                _notify(progress_callback, 'waiting_for_scan', '请在弹出的浏览器窗口中扫码登录。')
                print('=' * 50)
                print('请在弹出的浏览器窗口中扫描二维码登录')
                print('登录成功后将自动继续...')
                print('=' * 50)
                try:
                    page.wait_for_url(
                        re.compile(r'mp\.weixin\.qq\.com/cgi-bin/'),
                        timeout=120_000,
                    )
                except PwTimeout as exc:
                    context.close()
                    raise AuthError('登录超时（120秒），请重新运行程序') from exc

            if 'token=' not in page.url:
                _notify(progress_callback, 'verifying', '扫码成功，正在校验登录状态...')
                try:
                    page.wait_for_url(re.compile(r'token=\d+'), timeout=15_000)
                except PwTimeout:
                    page.goto('https://mp.weixin.qq.com/cgi-bin/home?t=home/index')
                    page.wait_for_load_state('networkidle', timeout=10_000)
            else:
                _notify(progress_callback, 'verifying', '登录状态确认中...')

            token = _extract_token(page)
            cookie = _extract_cookie(context)
            context.close()
    except PlaywrightError as exc:
        message = str(exc)
        if 'Executable doesn\'t exist' in message:
            if auto_install_browser and _install_playwright_chromium():
                return _get_credentials_from_playwright(auto_install_browser=False, progress_callback=progress_callback)
            raise AuthError(
                '未安装 Playwright 浏览器，请执行 `python -m playwright install chromium`；'
                '若使用 Docker，请执行 `docker compose exec backend python -m playwright install chromium`'
            ) from exc
        if 'Missing X server' in message or 'ozone_platform_x11' in message or 'No protocol specified' in message:
            raise AuthError('当前环境无法启动可视化浏览器，请改用环境变量凭证（WECHAT_COOKIE/WECHAT_TOKEN）') from exc
        raise AuthError(f'启动扫码浏览器失败：{message}') from exc

    print(f'登录成功！成功获取凭证 (token: {token[:6]}...)')
    return {'cookie': cookie, 'token': token}


def get_playwright_status() -> dict:
    playwright_installed = importlib.util.find_spec('playwright') is not None
    can_visual_login = False
    visual_login_message = '当前环境暂不支持可视化扫码登录。'

    if runtime_config.AUTH_MODE == 'env':
        visual_login_message = '当前使用环境变量登录模式，无需弹出扫码窗口。'
    elif sys.platform.startswith('win') or sys.platform == 'darwin':
        can_visual_login = True
        visual_login_message = '当前环境支持弹出扫码浏览器。'
    elif os.getenv('DISPLAY') or os.getenv('WAYLAND_DISPLAY'):
        can_visual_login = True
        visual_login_message = '已检测到图形界面环境，可使用扫码登录。'
    else:
        visual_login_message = '当前环境缺少图形界面，建议改用环境变量凭证登录。'

    return {
        'playwrightInstalled': playwright_installed,
        'canVisualLogin': can_visual_login,
        'visualLoginMessage': visual_login_message,
    }


def get_credentials(mode: str | None = None, progress_callback=None):
    selected_mode = (mode or runtime_config.AUTH_MODE or 'auto').strip().lower()
    if selected_mode == 'env':
        return _get_credentials_from_env(progress_callback=progress_callback)
    if selected_mode == 'playwright':
        return _get_credentials_from_playwright(progress_callback=progress_callback)
    if selected_mode != 'auto':
        raise AuthError(f'不支持的 AUTH_MODE: {selected_mode}，可选值为 auto/env/playwright')
    try:
        return _get_credentials_from_env(progress_callback=progress_callback)
    except AuthError:
        return _get_credentials_from_playwright(progress_callback=progress_callback)
