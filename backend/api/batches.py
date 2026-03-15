from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.batch_service import BatchService

router = APIRouter(prefix='/api/batches', tags=['batches'])


@router.get('')
def list_batches(db: Session = Depends(get_db)):
    service = BatchService(db)
    return service.list_batches()


@router.get('/{batch_id}')
def get_batch_detail(batch_id: int, db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        return service.get_batch_detail(batch_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
