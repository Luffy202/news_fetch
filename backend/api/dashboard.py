from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.dashboard_service import DashboardService

router = APIRouter(prefix='/api/dashboard', tags=['dashboard'])


@router.get('/summary')
def get_dashboard_summary(db: Session = Depends(get_db)):
    service = DashboardService(db)
    return service.get_summary()
