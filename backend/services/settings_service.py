from __future__ import annotations

from datetime import datetime
import os
from sqlalchemy.orm import Session

from backend import runtime_config
from backend.storage.repositories import SettingsRepository


def serialize_settings(settings) -> dict:
    return {
        'feishuWebhook': settings.feishu_webhook,
        'articleCount': settings.article_count,
        'requestInterval': settings.request_interval,
        'loginStatus': settings.login_status,
        'lastLoginAt': settings.last_login_at.isoformat() if settings.last_login_at else None,
    }


class SettingsService:
    def __init__(self, db: Session):
        self.repository = SettingsRepository(db)

    def get_settings(self):
        settings = self.repository.get_singleton()
        runtime_config.REQUEST_INTERVAL = settings.request_interval
        runtime_config.ARTICLE_COUNT = settings.article_count
        runtime_config.FEISHU_WEBHOOK = settings.feishu_webhook or runtime_config.FEISHU_WEBHOOK
        return settings

    def update_settings(
        self,
        *,
        feishu_webhook: str | None | object = None,
        article_count: int | None = None,
        request_interval: float | None = None,
        login_status: str | None = None,
        last_login_at: datetime | None | object = None,
    ):
        settings = self.repository.get_singleton()
        updated = self.repository.update(
            settings,
            feishu_webhook=feishu_webhook,
            article_count=article_count,
            request_interval=request_interval,
            login_status=login_status,
            last_login_at=last_login_at,
        )
        runtime_config.REQUEST_INTERVAL = updated.request_interval
        runtime_config.ARTICLE_COUNT = updated.article_count
        runtime_config.FEISHU_WEBHOOK = updated.feishu_webhook or ''
        if updated.feishu_webhook:
            os.environ['FEISHU_WEBHOOK'] = updated.feishu_webhook
        elif 'FEISHU_WEBHOOK' in os.environ:
            del os.environ['FEISHU_WEBHOOK']
        return updated
