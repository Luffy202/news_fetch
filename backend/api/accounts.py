from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.account_service import AccountService
from backend.services.errors import ConflictError

router = APIRouter(prefix='/api/accounts', tags=['accounts'])


class AccountCreatePayload(BaseModel):
    name: str
    isSelected: bool = False


class AccountUpdatePayload(BaseModel):
    name: str | None = None
    isSelected: bool | None = None


@router.get('')
def list_accounts(db: Session = Depends(get_db)):
    service = AccountService(db)
    accounts = service.list_accounts()
    return [
        {
            'id': account.id,
            'name': account.name,
            'fakeid': account.fakeid,
            'isSelected': account.is_selected,
        }
        for account in accounts
    ]


@router.post('', status_code=201)
def create_account(payload: AccountCreatePayload, db: Session = Depends(get_db)):
    service = AccountService(db)
    try:
        account = service.create_account(payload.name, payload.isSelected)
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        'id': account.id,
        'name': account.name,
        'fakeid': account.fakeid,
        'isSelected': account.is_selected,
    }


@router.patch('/{account_id}')
def update_account(account_id: int, payload: AccountUpdatePayload, db: Session = Depends(get_db)):
    service = AccountService(db)
    try:
        account = service.update_account(account_id, name=payload.name, is_selected=payload.isSelected)
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        'id': account.id,
        'name': account.name,
        'fakeid': account.fakeid,
        'isSelected': account.is_selected,
    }


@router.delete('/{account_id}', status_code=204)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    service = AccountService(db)
    try:
        service.delete_account(account_id)
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)
