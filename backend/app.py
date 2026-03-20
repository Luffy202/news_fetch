from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.api import api_router
from backend.api.app_status import router as app_status_router
from backend.api.accounts import router as accounts_router
from backend.api.auth import router as auth_router
from backend.api.batches import router as batches_router
from backend.api.crawl import router as crawl_router
from backend.api.dashboard import router as dashboard_router
from backend.api.exports import router as exports_router
from backend.api.feishu import router as feishu_router
from backend.api.settings import router as settings_router
from backend.storage.database import init_db


app = FastAPI(title='WeChat News Fetch Dashboard API')
FRONTEND_DIST_DIR = Path(__file__).resolve().parents[1] / 'frontend' / 'dist'

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制为前端的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router.include_router(accounts_router)
api_router.include_router(app_status_router)
api_router.include_router(auth_router)
api_router.include_router(crawl_router)
api_router.include_router(batches_router)
api_router.include_router(settings_router)
api_router.include_router(feishu_router)
api_router.include_router(dashboard_router)
api_router.include_router(exports_router)
app.include_router(api_router)
init_db()


@app.get('/health')
def health_check():
    return {'status': 'ok'}


@app.get('/{full_path:path}', include_in_schema=False)
def serve_frontend(full_path: str):
    if full_path == 'api' or full_path.startswith('api/'):
        raise HTTPException(status_code=404, detail='接口不存在')
    if not FRONTEND_DIST_DIR.exists():
        raise HTTPException(status_code=404, detail='前端静态资源尚未构建')

    candidate = FRONTEND_DIST_DIR / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)

    index_path = FRONTEND_DIST_DIR / 'index.html'
    if index_path.exists():
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail='前端首页不存在')
