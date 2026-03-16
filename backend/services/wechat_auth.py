from __future__ import annotations

import re
from pathlib import Path

from backend import runtime_config


class AuthError(Exception):
    pass


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


def _get_credentials_from_env():
    cookie = runtime_config.COOKIE.strip()
    token = runtime_config.TOKEN.strip()
    if not cookie or not token:
        raise AuthError('未检测到环境变量凭证，请设置 WECHAT_COOKIE 和 WECHAT_TOKEN')
    return {'cookie': cookie, 'token': token}


def _get_credentials_from_playwright():
    try:
        from playwright.sync_api import Error as PlaywrightError, TimeoutError as PwTimeout, sync_playwright
    except ModuleNotFoundError as exc:
        if exc.name == 'playwright':
            raise AuthError(
                '后端未安装 Playwright，请先执行 `pip install -r backend/requirements.txt`，然后执行 `python -m playwright install chromium`'
            ) from exc
        raise

    user_data_dir = str(Path(__file__).resolve().parents[2] / 'browser_data')

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
                print('检测到已有登录状态，无需重新扫码')
            else:
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
                try:
                    page.wait_for_url(re.compile(r'token=\d+'), timeout=15_000)
                except PwTimeout:
                    page.goto('https://mp.weixin.qq.com/cgi-bin/home?t=home/index')
                    page.wait_for_load_state('networkidle', timeout=10_000)

            token = _extract_token(page)
            cookie = _extract_cookie(context)
            context.close()
    except PlaywrightError as exc:
        message = str(exc)
        if 'Executable doesn\'t exist' in message:
            raise AuthError('未安装 Playwright 浏览器，请先执行 `python -m playwright install chromium`') from exc
        if 'Missing X server' in message or 'ozone_platform_x11' in message or 'No protocol specified' in message:
            raise AuthError('当前环境无法启动可视化浏览器，请改用环境变量凭证（WECHAT_COOKIE/WECHAT_TOKEN）') from exc
        raise AuthError(f'启动扫码浏览器失败：{message}') from exc

    print(f'登录成功！成功获取凭证 (token: {token[:6]}...)')
    return {'cookie': cookie, 'token': token}


def get_credentials(mode: str | None = None):
    selected_mode = (mode or runtime_config.AUTH_MODE or 'auto').strip().lower()
    if selected_mode == 'env':
        return _get_credentials_from_env()
    if selected_mode == 'playwright':
        return _get_credentials_from_playwright()
    if selected_mode != 'auto':
        raise AuthError(f'不支持的 AUTH_MODE: {selected_mode}，可选值为 auto/env/playwright')
    try:
        return _get_credentials_from_env()
    except AuthError:
        return _get_credentials_from_playwright()
