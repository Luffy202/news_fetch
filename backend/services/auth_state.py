from __future__ import annotations

from threading import Lock


TRANSIENT_AUTH_STATUSES = {
    'logging_in',
    'launching_browser',
    'waiting_for_scan',
    'verifying',
}


DEFAULT_AUTH_MESSAGES = {
    'logged_out': '请先完成微信登录，再开始抓取。',
    'logging_in': '正在启动微信登录窗口...',
    'launching_browser': '正在启动微信登录窗口...',
    'waiting_for_scan': '请在弹出的浏览器窗口中扫码登录。',
    'verifying': '正在校验登录状态，请稍候...',
    'logged_in': '登录已完成，可以直接开始抓取。',
    'failed': '登录失败，请重试。',
    'expired': '登录状态已失效，请重新扫码登录。',
}


class AuthStateManager:
    def __init__(self) -> None:
        self._lock = Lock()
        self._running = False
        self._message = DEFAULT_AUTH_MESSAGES['logged_out']
        self._last_error: str | None = None

    def begin(self) -> bool:
        with self._lock:
            if self._running:
                return False
            self._running = True
            self._last_error = None
            self._message = DEFAULT_AUTH_MESSAGES['launching_browser']
            return True

    def update(self, status: str, message: str | None = None) -> None:
        with self._lock:
            self._message = message or DEFAULT_AUTH_MESSAGES.get(status, '')
            if status != 'failed':
                self._last_error = None

    def mark_failed(self, error_message: str) -> None:
        with self._lock:
            self._running = False
            self._last_error = error_message
            self._message = error_message or DEFAULT_AUTH_MESSAGES['failed']

    def mark_finished(self, status: str, message: str | None = None) -> None:
        with self._lock:
            self._running = False
            self._message = message or DEFAULT_AUTH_MESSAGES.get(status, '')
            if status != 'failed':
                self._last_error = None

    def reset_if_stale(self) -> bool:
        with self._lock:
            if self._running:
                return False
            self._message = DEFAULT_AUTH_MESSAGES['logged_out']
            self._last_error = None
            return True

    def is_running(self) -> bool:
        with self._lock:
            return self._running

    def build_payload(self, *, status: str, last_login_at: str | None) -> dict:
        with self._lock:
            return {
                'loginStatus': status,
                'lastLoginAt': last_login_at,
                'message': self._message or DEFAULT_AUTH_MESSAGES.get(status, ''),
                'lastError': self._last_error if status == 'failed' else None,
                'canRetry': (not self._running) and status in {'logged_out', 'failed', 'expired'},
            }


auth_state_manager = AuthStateManager()
