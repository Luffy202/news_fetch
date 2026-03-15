from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.batch_service import BatchService

router = APIRouter(prefix='/api/crawl', tags=['crawl'])


@router.post('', status_code=202)
def start_crawl(db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        return service.start_crawl()
    except ValueError as exc:
        message = str(exc)
        status_code = 409 if '正在执行' in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.get('/current')
def get_current_task(db: Session = Depends(get_db)):
    service = BatchService(db)
    return service.get_current_task()
