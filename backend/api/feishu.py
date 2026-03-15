from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.feishu_service import FeishuService

router = APIRouter(prefix='/api/batches', tags=['feishu'])


@router.post('/{batch_id}/feishu-push')
def push_batch_to_feishu(batch_id: int, db: Session = Depends(get_db)):
    service = FeishuService(db)
    try:
        return service.push_batch(batch_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if '不存在' in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
