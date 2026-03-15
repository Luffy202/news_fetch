from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.auth_service import AuthService

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.get('/status')
def get_auth_status(db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.get_status()


@router.post('/login', status_code=202)
def trigger_login(db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        return service.trigger_login()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
