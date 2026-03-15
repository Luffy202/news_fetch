"""遗留兼容层：导出后端抓取实现。"""

from backend.services.wechat_fetcher import _cookie, _get_headers, _token, fetch_account_articles, get_articles, search_account, set_credentials

__all__ = [
    '_cookie',
    '_get_headers',
    '_token',
    'fetch_account_articles',
    'get_articles',
    'search_account',
    'set_credentials',
]
