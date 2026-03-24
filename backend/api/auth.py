from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.auth_service import AuthService

router = APIRouter(prefix='/api/auth', tags=['auth'])


class LoginPayload(BaseModel):
    force: bool = False


@router.get('/status')
def get_auth_status(db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.get_status()


@router.post('/login', status_code=202)
def trigger_login(payload: LoginPayload | None = None, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        return service.trigger_login(force=payload.force if payload else False)
    except ValueError as exc:
        message = str(exc)
        status_code = 409 if '进行中' in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
