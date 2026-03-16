from __future__ import annotations

from datetime import datetime
import logging
from sqlalchemy.orm import Session

from backend.services.wechat_auth import AuthError, get_credentials
from backend.services.crawler_service import crawler_service
from backend.services.settings_service import SettingsService

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: Session):
        self.settings_service = SettingsService(db)

    def get_status(self) -> dict:
        settings = self.settings_service.get_settings()
        return {
            'loginStatus': settings.login_status,
            'lastLoginAt': settings.last_login_at.isoformat() if settings.last_login_at else None,
        }

    def restore_credentials(self) -> bool:
        try:
            credentials = get_credentials()
            crawler_service.set_credentials(credentials['cookie'], credentials['token'])
            return True
        except (AuthError, ImportError) as exc:
            self.settings_service.update_settings(login_status='logged_out')
            logger.warning('恢复登录凭证失败: %s', exc)
            return False

    def trigger_login(self) -> dict:
        logger.info('开始扫码登录流程')
        self.settings_service.update_settings(login_status='logging_in')
        try:
            credentials = get_credentials()
            crawler_service.set_credentials(credentials['cookie'], credentials['token'])
            settings = self.settings_service.update_settings(
                login_status='logged_in',
                last_login_at=datetime.utcnow(),
            )
            logger.info('扫码登录成功')
        except (AuthError, ImportError) as exc:
            settings = self.settings_service.update_settings(login_status='logged_out')
            logger.warning('扫码登录失败: %s', exc)
            raise ValueError(str(exc)) from exc
        return {
            'loginStatus': settings.login_status,
            'lastLoginAt': settings.last_login_at.isoformat() if settings.last_login_at else None,
        }
