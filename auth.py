"""遗留兼容层：导出后端登录实现。"""

from backend.services.wechat_auth import AuthError, _extract_cookie, _extract_token, get_credentials

__all__ = ['AuthError', '_extract_cookie', '_extract_token', 'get_credentials']
