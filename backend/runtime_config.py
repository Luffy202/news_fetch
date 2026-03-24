from __future__ import annotations

import os


DEFAULT_ACCOUNTS = [
    '群响刘老板',
    '梁狗蛋',
    '人神共奋',
]
DEFAULT_ARTICLE_COUNT = 10
DEFAULT_REQUEST_INTERVAL = 4.0
DEFAULT_KIMI_MODEL = 'kimi-k2-0905-preview'
DEFAULT_KIMI_REQUEST_INTERVAL = 2.0


def _get_env_int(name: str, default: int) -> int:
    value = os.getenv(name, '').strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_env_float(name: str, default: float) -> float:
    value = os.getenv(name, '').strip()
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _get_env_accounts() -> list[str]:
    raw = os.getenv('WECHAT_ACCOUNTS', '').strip()
    if not raw:
        return list(DEFAULT_ACCOUNTS)
    accounts = [item.strip() for item in raw.split(',') if item.strip()]
    return accounts or list(DEFAULT_ACCOUNTS)


COOKIE = os.getenv('WECHAT_COOKIE', '').strip()
TOKEN = os.getenv('WECHAT_TOKEN', '').strip()
ACCOUNTS = _get_env_accounts()
ARTICLE_COUNT = _get_env_int('ARTICLE_COUNT', DEFAULT_ARTICLE_COUNT)
REQUEST_INTERVAL = _get_env_float('REQUEST_INTERVAL', DEFAULT_REQUEST_INTERVAL)
PROXY_URL = os.getenv('WECHAT_PROXY_URL', '').strip() or os.getenv('HTTP_PROXY_URL', '').strip()
KIMI_API_KEY = os.getenv('KIMI_API_KEY', '').strip()
KIMI_MODEL = os.getenv('KIMI_MODEL', DEFAULT_KIMI_MODEL).strip() or DEFAULT_KIMI_MODEL
KIMI_REQUEST_INTERVAL = _get_env_float('KIMI_REQUEST_INTERVAL', DEFAULT_KIMI_REQUEST_INTERVAL)
FEISHU_WEBHOOK = os.getenv('FEISHU_WEBHOOK', '').strip()
AUTH_MODE = (os.getenv('AUTH_MODE', 'auto').strip() or 'auto').lower()
