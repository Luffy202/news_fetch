from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.batch_service import BatchService
from backend.services.errors import ConflictError

router = APIRouter(prefix='/api/crawl', tags=['crawl'])


@router.post('', status_code=202)
def start_crawl(db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        return service.start_crawl()
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get('/current')
def get_current_task(db: Session = Depends(get_db)):
    service = BatchService(db)
    return service.get_current_task()
