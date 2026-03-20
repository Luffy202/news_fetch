from __future__ import annotations

from fastapi import APIRouter

from backend.services.bootstrap_service import BootstrapService


router = APIRouter(prefix='/api/app', tags=['app'])


@router.get('/bootstrap-status')
def get_bootstrap_status():
    service = BootstrapService()
    return service.get_status()
