from __future__ import annotations

from datetime import datetime
import logging
from threading import Thread
from sqlalchemy.orm import Session

from backend.storage.database import SessionLocal
from backend.services.auth_state import DEFAULT_AUTH_MESSAGES, TRANSIENT_AUTH_STATUSES, auth_state_manager
from backend.services.wechat_auth import AuthError, get_credentials
from backend.services.crawler_service import crawler_service
from backend.services.settings_service import SettingsService

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.settings_service = SettingsService(db)

    def get_status(self) -> dict:
        settings = self.settings_service.get_settings()
        status = settings.login_status
        if status == 'logging_in':
            status = 'launching_browser'
        if status in TRANSIENT_AUTH_STATUSES and not auth_state_manager.is_running():
            settings = self.settings_service.update_settings(login_status='logged_out')
            auth_state_manager.reset_if_stale()
            status = settings.login_status
        return auth_state_manager.build_payload(
            status=status,
            last_login_at=settings.last_login_at.isoformat() if settings.last_login_at else None,
        )

    def restore_credentials(self) -> bool:
        try:
            credentials = get_credentials()
            crawler_service.set_credentials(credentials['cookie'], credentials['token'])
            return True
        except (AuthError, ImportError) as exc:
            self.mark_expired(str(exc))
            logger.warning('恢复登录凭证失败: %s', exc)
            return False

    def mark_expired(self, message: str = DEFAULT_AUTH_MESSAGES['expired']) -> None:
        self.settings_service.update_settings(login_status='expired')
        auth_state_manager.mark_failed(message)

    def trigger_login(self, force: bool = False) -> dict:
        logger.info('开始登录流程')
        settings = self.settings_service.get_settings()
        if not force and settings.login_status == 'logged_in' and crawler_service.has_credentials():
            return self.get_status()
        if not auth_state_manager.begin():
            return self.get_status()

        self.settings_service.update_settings(login_status='launching_browser')
        thread = Thread(target=run_login_job, daemon=True)
        thread.start()
        return self.get_status()


def run_login_job() -> None:
    logger.info('后台登录线程开始')
    db = SessionLocal()
    settings_service = SettingsService(db)

    def update_progress(status: str, message: str) -> None:
        auth_state_manager.update(status, message)
        settings_service.update_settings(login_status=status)

    try:
        update_progress('launching_browser', DEFAULT_AUTH_MESSAGES['launching_browser'])
        credentials = get_credentials(progress_callback=update_progress)
        crawler_service.set_credentials(credentials['cookie'], credentials['token'])
        settings_service.update_settings(
            login_status='logged_in',
            last_login_at=datetime.utcnow(),
        )
        auth_state_manager.mark_finished('logged_in', DEFAULT_AUTH_MESSAGES['logged_in'])
        logger.info('扫码登录成功')
    except (AuthError, ImportError) as exc:
        settings_service.update_settings(login_status='failed')
        auth_state_manager.mark_failed(str(exc))
        logger.warning('登录失败: %s', exc)
    finally:
        db.close()
