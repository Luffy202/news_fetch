from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.services.export_service import ExportService

router = APIRouter(tags=['exports'])


@router.get('/api/articles/{article_id}/markdown')
def download_article_markdown(article_id: int, db: Session = Depends(get_db)):
    service = ExportService(db)
    try:
        filename, content = service.export_article_markdown(article_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(
        content=content,
        media_type='text/markdown; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('/api/batches/{batch_id}/markdown-export')
def download_batch_markdown_zip(batch_id: int, db: Session = Depends(get_db)):
    service = ExportService(db)
    try:
        filename, content = service.export_batch_zip(batch_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if '不存在' in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return Response(
        content=content,
        media_type='application/zip',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )
