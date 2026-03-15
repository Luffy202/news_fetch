from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.settings_service import SettingsService, serialize_settings

router = APIRouter(prefix='/api/settings', tags=['settings'])


class SettingsPayload(BaseModel):
    feishuWebhook: str | None = None
    articleCount: int | None = None
    requestInterval: float | None = None


@router.get('')
def get_settings(db: Session = Depends(get_db)):
    service = SettingsService(db)
    settings = service.get_settings()
    return serialize_settings(settings)


@router.patch('')
def update_settings(payload: SettingsPayload, db: Session = Depends(get_db)):
    service = SettingsService(db)
    try:
        settings = service.update_settings(
            feishu_webhook=payload.feishuWebhook,
            article_count=payload.articleCount,
            request_interval=payload.requestInterval,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_settings(settings)
