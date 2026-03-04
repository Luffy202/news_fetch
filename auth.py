"""微信公众平台自动登录模块

使用 Playwright 持久化上下文打开浏览器，用户扫码登录后自动提取凭证。
首次扫码后，短期内（约2小时）再次运行无需重新扫码。
"""

import re
from pathlib import Path


class AuthError(Exception):
    """登录或凭证提取失败"""


def _extract_token(page):
    """从页面 URL 中提取 token"""
    match = re.search(r"token=(\d+)", page.url)
    if not match:
        raise AuthError("无法从 URL 中提取 token")
    return match.group(1)


def _extract_cookie(context):
    """从浏览器上下文中提取 cookie 字符串"""
    cookies = context.cookies("https://mp.weixin.qq.com")
    if not cookies:
        raise AuthError("无法获取 cookie，cookie 列表为空")
    return "; ".join(f"{c['name']}={c['value']}" for c in cookies)


def get_credentials():
    """自动登录微信公众平台，返回 {"cookie": str, "token": str}

    使用 Playwright persistent context，首次需要扫码，之后复用 session。
    """
    from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

    user_data_dir = str(Path(__file__).parent / "browser_data")

    print("正在启动浏览器...")

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://mp.weixin.qq.com/")

        # 检测是否已登录（URL 跳转到后台首页）
        if "cgi-bin/home" in page.url and "token=" in page.url:
            print("检测到已有登录状态，无需重新扫码")
        else:
            print("=" * 50)
            print("请在弹出的浏览器窗口中扫描二维码登录")
            print("登录成功后将自动继续...")
            print("=" * 50)
            try:
                # 等待跳转离开登录页，登录后可能跳转到 home、frame 等不同路径
                page.wait_for_url(
                    re.compile(r"mp\.weixin\.qq\.com/cgi-bin/"),
                    timeout=120_000,
                )
            except PwTimeout:
                context.close()
                raise AuthError("登录超时（120秒），请重新运行程序")

        # 登录后可能跳转到中间页面，确保到达带 token 的首页
        if "token=" not in page.url:
            try:
                page.wait_for_url(re.compile(r"token=\d+"), timeout=15_000)
            except PwTimeout:
                # 手动导航到首页
                page.goto("https://mp.weixin.qq.com/cgi-bin/home?t=home/index")
                page.wait_for_load_state("networkidle", timeout=10_000)

        token = _extract_token(page)
        cookie = _extract_cookie(context)

        context.close()

    print(f"登录成功！成功获取凭证 (token: {token[:6]}...)")
    return {"cookie": cookie, "token": token}
